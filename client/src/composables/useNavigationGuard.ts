import { useAppStore } from '../store/app';

export function useNavigationGuard() {
  const { activeModal } = useAppStore();

  function hasOpenModal(): boolean {
    if (!activeModal.value) {
      return true;
    }

    const answer: boolean = window.confirm(
      'Do you really want to leave? You should finish the action in the modal',
    );

    // cancel the navigation and stay on the same page
    if (!answer) {
      return false;
    }
  }

  return { hasOpenModal };
}
