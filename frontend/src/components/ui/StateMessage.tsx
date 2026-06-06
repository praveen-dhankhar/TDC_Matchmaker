type StateMessageProps = {
  title: string;
  body?: string;
};

export function StateMessage({ title, body }: StateMessageProps) {
  return (
    <div className="panel flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {body ? <p className="mt-2 max-w-md text-sm text-muted">{body}</p> : null}
    </div>
  );
}
