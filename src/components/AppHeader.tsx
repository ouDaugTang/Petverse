type AppHeaderProps = {
  title: string;
};

export default function AppHeader({ title }: AppHeaderProps) {
  return (
    <header>
      <h1>{title}</h1>
    </header>
  );
}
