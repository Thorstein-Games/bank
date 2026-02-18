import styles from "./AppShell.module.css";

interface SettingsIconButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

function buildButtonClassNames(...classNames: string[]): string {
  return classNames.filter(Boolean).join(" ");
}

export default function SettingsIconButton({
  isOpen,
  onClick,
  className = "",
}: SettingsIconButtonProps) {
  return (
    <button
      className={buildButtonClassNames(styles.settingsIconButton, className)}
      type="button"
      onClick={onClick}
      aria-label="Settings"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls="settings-modal"
    >
      <svg
        className={styles.settingsIcon}
        viewBox="0 0 24 24"
        fill="none"
        role="presentation"
        aria-hidden="true"
      >
        <path
          d="M12 3.5 13.7 5.3 16.2 4.9 16.9 7.3 19.2 8.5 18 10.7 18.7 13.1 16.2 13.7 14.5 15.5 12.5 14.1 10.2 14.7 9.6 12.2 7.5 10.8 9.1 8.9 8.8 6.5 11.3 6.1 12 3.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10.1" r="2.2" fill="currentColor" />
      </svg>
    </button>
  );
}
