import { test1 } from '@/07-typescript-plugin/test';
// import styles from './Card.module.css';

// import styles from '@/07-typescript-plugin/Card.module.css';

stylesx.wrapper

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      <div className="styles.content">{children}</div>
    </div>
  );
}
