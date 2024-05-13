export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="styles.wrapper">
      <div className="styles.content">{children}</div>
    </div>
  );
}
