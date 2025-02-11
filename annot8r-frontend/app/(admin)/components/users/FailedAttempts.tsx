interface FailedAttemptsProps {
  count: number;
}

export function FailedAttempts({ count }: FailedAttemptsProps) {
  return (
    <span
      className={`font-medium ${count > 0 ? "text-red-600" : "text-gray-600"}`}
    >
      {count}
    </span>
  );
}
