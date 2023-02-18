import styles from './Button.module.css';

function Button() {
  return (
    <button className={styles.button}>
      <span className={styles.text}>
        Click me!
      </span>
    </button>
  );
}
