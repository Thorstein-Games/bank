import styles from "../AppShell.module.css";
import type { LiveAnnouncement } from "./appShellUtils";

interface AppShellAnnouncementsProps {
  politeAnnouncement: LiveAnnouncement;
  assertiveAnnouncement: LiveAnnouncement;
}

export default function AppShellAnnouncements({
  politeAnnouncement,
  assertiveAnnouncement,
}: AppShellAnnouncementsProps) {
  return (
    <>
      <div
        className={styles.visuallyHidden}
        aria-live="polite"
        aria-atomic="true"
      >
        <span key={politeAnnouncement.id}>{politeAnnouncement.text}</span>
      </div>
      <div
        className={styles.visuallyHidden}
        aria-live="assertive"
        aria-atomic="true"
      >
        <span key={assertiveAnnouncement.id}>{assertiveAnnouncement.text}</span>
      </div>
    </>
  );
}
