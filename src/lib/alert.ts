import Swal from 'sweetalert2';

/**
 * Pre-themed SweetAlert2 instance matching the app's dark glass theme.
 * Use for all confirm/info popups.
 */
export const Alert = Swal.mixin({
  background: 'oklch(0.15 0.025 260)',
  color: 'oklch(0.95 0.01 260)',
  confirmButtonColor: 'oklch(0.72 0.19 195)',
  cancelButtonColor: 'oklch(0.25 0.03 260)',
  customClass: {
    popup: 'rounded-2xl border border-[oklch(0.3_0.03_260/40%)] shadow-2xl',
    title: 'text-lg font-bold',
    htmlContainer: 'text-sm',
    confirmButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold',
    cancelButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold',
  },
  buttonsStyling: true,
});

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
  background: 'oklch(0.15 0.025 260)',
  color: 'oklch(0.95 0.01 260)',
  customClass: {
    popup: 'rounded-xl border border-[oklch(0.3_0.03_260/40%)] shadow-2xl',
  },
});
