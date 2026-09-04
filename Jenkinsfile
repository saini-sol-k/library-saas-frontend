/*
 * End-to-end CI/CD for the Library SaaS frontend.
 *
 *   Checkout -> Preflight -> npm ci -> TypeScript -> ESLint -> Vitest ->
 *   Next Build -> Docker Build -> Push to local registry -> Kubernetes Deploy ->
 *   Rollout Verification -> Health Check -> Smoke Tests
 *
 * This mirrors the backend pipeline's operational pattern deliberately: same
 * agent, same registry, same namespace, same tagging scheme, same ClusterIP +
 * port-forward verification. Only the build tooling differs.
 *
 * Agent: Windows, Windows PowerShell 5.1. No PowerShell 7-only parameters are
 * used (notably -SkipHttpErrorCheck, which does not exist on 5.1).
 *
 * Environment facts this pipeline depends on, all shared with the backend:
 *  - The Kubernetes node (desktop-control-plane) keeps its own containerd image
 *    store, so a locally built image is NOT visible to it. Images are pushed to a
 *    registry container on the host and pulled back by the node at 192.168.65.254.
 *  - NodePort is not published to the Windows host on this node, so the service
 *    is ClusterIP and reached through `kubectl port-forward`.
 *  - The backend is reached in-cluster as http://library-saas-backend:8080. The
 *    browser never uses that URL: it calls this app's own /api/backend proxy.
 *
 * No Jenkins credentials are required. The frontend holds no secret: its only
 * configuration is BACKEND_API_URL, which is non-sensitive and set in
 * k8s/deployment.yaml.
 */

pipeline {

    agent any

    tools {
        nodejs "node22"
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
    }

    parameters {
        string(
            name: 'K8S_NAMESPACE',
            defaultValue: 'library-saas',
            description: 'Target Kubernetes namespace. Shared with the backend.')
        string(
            name: 'REGISTRY',
            defaultValue: '192.168.65.254:5000',
            description: 'Local registry as addressed BY THE CLUSTER NODE. Pushes go to ' +
                         'localhost:5000, which is the same registry container.')
        string(
            name: 'VERIFY_PORT',
            defaultValue: '3095',
            description: 'Local port used for the port-forward during verification. ' +
                         'Must not collide with 3000/8080/8081/8082/8095.')
    }

    environment {
        // Re-exported so every stage is independent of whether the parameters
        // have already been registered by a first run.
        K8S_NAMESPACE = "${params.K8S_NAMESPACE}"
        REGISTRY      = "${params.REGISTRY}"
        VERIFY_PORT   = "${params.VERIFY_PORT}"

        IMAGE_NAME  = "library-saas-frontend"
        DEPLOYMENT  = "library-saas-frontend"
        PF_PID_FILE = 'deploy\\portforward.pid'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHA = bat(script: '@git rev-parse --short HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHA}"
                    currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.GIT_SHA}"
                    echo "Image tag for this build: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Preflight') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"

                    # cmd /c avoids PowerShell 5.1 wrapping native stderr in ErrorRecords.
                    $nodeOut = cmd /c "node --version 2>&1"
                    $nodeVer = @($nodeOut)[0]
                    Write-Host "node   : $nodeVer"
                    if ($nodeVer -notmatch "^v(2[0-9]|[3-9][0-9])\\.") {
                        throw "Node 20 or newer required on the agent. Found: $nodeVer"
                    }

                    foreach ($t in @("npm --version","docker --version","kubectl version --client=true -o yaml","git --version")) {
                        $o = cmd /c "$t 2>&1"
                        if ($LASTEXITCODE -ne 0) { throw "Preflight failed running: $t" }
                        Write-Host ("{0,-8}: {1}" -f $t.Split(" ")[0], (@($o)[0]))
                    }

                    $nodes = cmd /c "kubectl get nodes --no-headers 2>&1"
                    if ($LASTEXITCODE -ne 0) { throw "Kubernetes cluster unreachable: $nodes" }
                    Write-Host "cluster: $(@($nodes)[0])"

                    try {
                        $r = Invoke-WebRequest -Uri "http://localhost:5000/v2/" -UseBasicParsing -TimeoutSec 10
                        Write-Host "registry: HTTP $($r.StatusCode)"
                    } catch {
                        throw "Local registry on localhost:5000 is not responding. Start it with: docker run -d --name local-registry -p 5000:5000 --restart=always registry:2"
                    }

                    # The frontend proxies to the backend, so deploying it in front of a
                    # missing backend produces a site that loads and then fails every
                    # request. Fail here instead, with a clear reason.
                    $svc = cmd /c "kubectl -n $env:K8S_NAMESPACE get service library-saas-backend --no-headers 2>&1"
                    if ($LASTEXITCODE -ne 0) {
                        throw "Backend service library-saas-backend not found in namespace $env:K8S_NAMESPACE. Deploy the backend first."
                    }
                    Write-Host "backend service: $(@($svc)[0])"

                    New-Item -ItemType Directory -Force -Path deploy | Out-Null
                '''
            }
        }

        stage('Install') {
            steps {
                // npm ci, not npm install: package-lock.json is committed, so this
                // resolves an identical dependency tree on every build and fails if
                // the lockfile and package.json have drifted apart.
                bat 'npm ci'
            }
        }

        stage('TypeScript') {
            steps {
                bat 'npx tsc --noEmit'
            }
        }

        stage('ESLint') {
            steps {
                bat 'npm run lint'
            }
        }

        stage('Vitest') {
            steps {
                bat 'npm test'
            }
        }

        stage('Next Build') {
            steps {
                bat 'npm run build'
                powershell '''
                    $ErrorActionPreference = "Stop"
                    if (-not (Test-Path ".next")) { throw "next build produced no .next directory" }
                    $size = (Get-ChildItem -Recurse ".next" | Measure-Object -Property Length -Sum).Sum / 1MB
                    Write-Host (".next: {0:N1} MB" -f $size)
                '''
            }
        }

        stage('Docker Build') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $tag = $env:IMAGE_TAG
                    cmd /c "docker build -t $env:IMAGE_NAME`:$tag . 2>&1" | Select-Object -Last 5
                    if ($LASTEXITCODE -ne 0) { throw "docker build failed" }

                    $img = cmd /c "docker images $env:IMAGE_NAME`:$tag --format `"{{.Repository}}:{{.Tag}} {{.Size}}`" 2>&1"
                    if (-not $img) { throw "image not found after build" }
                    Write-Host "built: $img"
                '''
            }
        }

        stage('Push to local registry') {
            steps {
                // The cluster node cannot see the Docker daemon's image store, so the
                // image is published to a registry both sides can reach. Pushing via
                // localhost avoids needing an insecure-registry entry in the daemon.
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $tag = $env:IMAGE_TAG
                    cmd /c "docker tag $env:IMAGE_NAME`:$tag localhost:5000/$env:IMAGE_NAME`:$tag 2>&1"
                    if ($LASTEXITCODE -ne 0) { throw "docker tag failed" }
                    cmd /c "docker push localhost:5000/$env:IMAGE_NAME`:$tag 2>&1" | Select-Object -Last 3
                    if ($LASTEXITCODE -ne 0) { throw "docker push failed" }

                    $tags = Invoke-RestMethod -Uri "http://localhost:5000/v2/$env:IMAGE_NAME/tags/list" -TimeoutSec 20
                    if ($tags.tags -notcontains $tag) { throw "tag $tag not present in registry after push" }
                    Write-Host "registry now holds: $($tags.tags -join ', ')"
                '''
            }
        }

        stage('Kubernetes Deploy') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $ns = $env:K8S_NAMESPACE

                    # The namespace belongs to the backend repository and is assumed to
                    # exist; only the frontend's own objects are applied here.
                    cmd /c "kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml 2>&1"
                    if ($LASTEXITCODE -ne 0) { throw "kubectl apply failed" }

                    $image = "$env:REGISTRY/$env:IMAGE_NAME`:$env:IMAGE_TAG"
                    cmd /c "kubectl -n $ns set image deployment/$env:DEPLOYMENT app=$image 2>&1"
                    if ($LASTEXITCODE -ne 0) { throw "kubectl set image failed" }
                    Write-Host "deployment image set to $image"
                '''
            }
        }

        stage('Rollout Verification') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $ns = $env:K8S_NAMESPACE

                    cmd /c "kubectl -n $ns rollout status deployment/$env:DEPLOYMENT --timeout=300s 2>&1"
                    if ($LASTEXITCODE -ne 0) {
                        Write-Host "--- pods ---";   cmd /c "kubectl -n $ns get pods 2>&1"
                        Write-Host "--- events ---"; cmd /c "kubectl -n $ns get events --sort-by=.lastTimestamp 2>&1" | Select-Object -Last 20
                        throw "rollout did not complete"
                    }

                    # rollout status alone is not proof. Verify the Deployment template
                    # carries this build's tag AND that a Ready pod is actually running
                    # it. Selecting items[0] is wrong: an old, still-terminating pod can
                    # be listed first, which makes the check read the previous build.
                    $deployImg = cmd /c "kubectl -n $ns get deployment $env:DEPLOYMENT -o jsonpath=`"{.spec.template.spec.containers[0].image}`" 2>&1"
                    Write-Host "deployment image : $deployImg"
                    if ("$deployImg" -notlike "*:$env:IMAGE_TAG") {
                        throw "deployment template runs $deployImg, expected tag $env:IMAGE_TAG"
                    }

                    $deadline = (Get-Date).AddSeconds(120)
                    $match = $null
                    while ((Get-Date) -lt $deadline) {
                        $rows = cmd /c "kubectl -n $ns get pods -l app.kubernetes.io/component=frontend --field-selector=status.phase=Running -o jsonpath=`"{range .items[*]}{.metadata.name} {.status.containerStatuses[0].ready} {.spec.containers[0].image}{'\\n'}{end}`" 2>&1"
                        foreach ($row in @($rows)) {
                            $parts = "$row".Trim().Split(@(' '), [StringSplitOptions]::RemoveEmptyEntries)
                            if ($parts.Count -ge 3 -and $parts[1] -eq "true" -and $parts[2] -like "*:$env:IMAGE_TAG") {
                                $match = $parts; break
                            }
                        }
                        if ($match) { break }
                        Start-Sleep -Seconds 5
                    }

                    if (-not $match) {
                        cmd /c "kubectl -n $ns get pods -o wide 2>&1"
                        throw "no Ready pod is running image tag $env:IMAGE_TAG"
                    }
                    Write-Host "pod   : $($match[0])"
                    Write-Host "ready : $($match[1])"
                    Write-Host "image : $($match[2])"
                '''
            }
        }

        stage('Health Check') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $ns = $env:K8S_NAMESPACE
                    $port = $env:VERIFY_PORT

                    # Win32_Process.Create rather than Start-Process: a child started
                    # with -NoNewWindow inherits Jenkins' stdout handle and the build
                    # step then blocks forever waiting for that handle to close. This
                    # launch is fully detached, so the step returns immediately.
                    # Win32_Process.Create does no PATH resolution, so kubectl must be
                    # given as an absolute path.
                    $kubectl = (Get-Command kubectl -ErrorAction Stop).Source
                    $cmdline = "`"$kubectl`" -n $ns port-forward service/$env:DEPLOYMENT $port`:3000"
                    $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create `
                           -Arguments @{ CommandLine = $cmdline }
                    if ($res.ReturnValue -ne 0) { throw "failed to start port-forward (rc=$($res.ReturnValue))" }
                    $res.ProcessId | Out-File -FilePath $env:PF_PID_FILE -Encoding ascii
                    Write-Host "port-forward PID $($res.ProcessId) on localhost:$port"

                    $deadline = (Get-Date).AddSeconds(120)
                    $up = $false
                    while ((Get-Date) -lt $deadline) {
                        try {
                            $r = Invoke-WebRequest -Uri "http://localhost:$port/login" -TimeoutSec 5 -UseBasicParsing
                            if ($r.StatusCode -eq 200) { $up = $true; break }
                        } catch { }
                        Start-Sleep -Seconds 3
                    }
                    if (-not $up) {
                        cmd /c "kubectl -n $ns logs deployment/$env:DEPLOYMENT --tail=60 2>&1"
                        throw "frontend did not serve /login through the service within 120s"
                    }
                    Write-Host "health: /login served via Kubernetes service"
                '''
            }
        }

        stage('Smoke Tests') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $base = "http://localhost:$env:VERIFY_PORT"
                    $script:failures = @()

                    # Windows PowerShell 5.1 has no -SkipHttpErrorCheck, so a non-2xx
                    # response throws and the status is read off the exception.
                    function Get-Status($method, $path, $body) {
                        try {
                            $r = Invoke-WebRequest -Uri "$base$path" -Method $method -Body $body `
                                 -ContentType "application/json" -TimeoutSec 20 -UseBasicParsing
                            return [int]$r.StatusCode
                        } catch {
                            if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
                            return -1
                        }
                    }
                    function Check($name, $actual, $expected) {
                        if ($actual -eq $expected) {
                            Write-Host ("PASS  {0,-34} {1}" -f $name, $actual)
                        } else {
                            Write-Host ("FAIL  {0,-34} got {1}, expected {2}" -f $name, $actual, $expected)
                            $script:failures += $name
                        }
                    }

                    Check "login page renders" (Get-Status GET "/login" $null) 200

                    # The proxy must reach the backend. An unauthenticated call has to
                    # come back 401 from the backend itself; a 502/504 would mean the
                    # in-cluster BACKEND_API_URL is wrong.
                    Check "proxy reaches backend (401)" (Get-Status GET "/api/backend/api/students/1" $null) 401

                    # A real login through the proxy proves the whole path end to end.
                    $body = '{"identifier":"manager1@brightfuture.example","password":"Password@123"}'
                    Check "login through proxy"  (Get-Status POST "/api/auth/login" $body) 200

                    # The backend URL is server-side only. If it ever leaked into the
                    # HTML the browser would try to reach the cluster directly.
                    $html = (Invoke-WebRequest -Uri "$base/login" -TimeoutSec 20 -UseBasicParsing).Content
                    if ($html -match "library-saas-backend:8080" -or $html -match "localhost:8095") {
                        Write-Host "FAIL  backend URL leaked into HTML"
                        $script:failures += "backend URL leaked into HTML"
                    } else {
                        Write-Host "PASS  backend URL not exposed to the browser"
                    }

                    if ($script:failures.Count -gt 0) {
                        throw "smoke tests failed: $($script:failures -join ', ')"
                    }
                    Write-Host "all smoke tests passed"
                '''
            }
        }
    }

    post {
        always {
            powershell '''
                $ErrorActionPreference = "SilentlyContinue"
                if (Test-Path $env:PF_PID_FILE) {
                    $procId = Get-Content $env:PF_PID_FILE
                    Write-Host "stopping port-forward PID $procId"
                    Stop-Process -Id $procId -Force
                    Remove-Item $env:PF_PID_FILE -Force
                }
            '''
            archiveArtifacts artifacts: 'deploy/*.log', allowEmptyArchive: true
        }
        success {
            script {
                echo "SUCCESS: ${env.IMAGE_NAME}:${env.IMAGE_TAG} deployed and verified in namespace ${params.K8S_NAMESPACE}"
            }
        }
        failure {
            powershell '''
                $ErrorActionPreference = "SilentlyContinue"
                $ns = $env:K8S_NAMESPACE
                Write-Host "--- pods ---";     cmd /c "kubectl -n $ns get pods -o wide 2>&1"
                Write-Host "--- describe ---"; cmd /c "kubectl -n $ns describe deployment/$env:DEPLOYMENT 2>&1" | Select-Object -Last 30
                Write-Host "--- app log ---";  cmd /c "kubectl -n $ns logs deployment/$env:DEPLOYMENT --tail=80 2>&1"
            '''
        }
    }
}
