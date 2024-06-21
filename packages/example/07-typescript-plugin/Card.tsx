// import { test1 } from '@/07-typescript-plugin/Card.module';
// import styles from './Card.module.css';

// import styles from '@/07-typescript-plugin/Card.module.css';

styles

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      <div className="styles.content">{children}</div>
    </div>
  );
}
