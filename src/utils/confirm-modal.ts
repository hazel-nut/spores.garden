/**
 * Custom confirmation modal that respects the app's styling.
 * Replaces browser's native confirm() dialog.
 */

export interface ConfirmModalOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmDanger?: boolean;
}

/**
 * Shows a styled confirmation modal and returns a promise that resolves
 * to true if confirmed, false if cancelled.
 */
export function showConfirmModal(options: ConfirmModalOptions): Promise<boolean> {
  const {
    title = 'Confirm',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmDanger = false,
  } = options;

  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal confirm-modal';
    modal.innerHTML = `
      <div class="modal-content confirm-modal-content">
        <h2>${title}</h2>
        <p class="confirm-modal-message">${message}</p>
        <div class="modal-actions">
          <button class="button button-secondary confirm-modal-cancel">${cancelText}</button>
          <button class="button ${confirmDanger ? 'button-danger' : ''} confirm-modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    const cleanup = (result: boolean) => {
      modal.remove();
      resolve(result);
    };

    // Confirm button
    modal.querySelector('.confirm-modal-confirm')?.addEventListener('click', () => {
      cleanup(true);
    });

    // Cancel button
    modal.querySelector('.confirm-modal-cancel')?.addEventListener('click', () => {
      cleanup(false);
    });

    // Click outside to cancel
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup(false);
      }
    });

    // Escape key to cancel
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleKeydown);
        cleanup(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    document.body.appendChild(modal);

    // Focus the confirm button for accessibility
    (modal.querySelector('.confirm-modal-confirm') as HTMLButtonElement)?.focus();
  });
}
