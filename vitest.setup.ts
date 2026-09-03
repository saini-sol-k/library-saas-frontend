import "@testing-library/jest-dom/vitest";

/**
 * jsdom ships the <dialog> element without showModal/close, which the Dialog
 * component relies on. Minimal stand-ins keep the real component under test
 * rather than forcing a test-only variant of it.
 */
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
}
