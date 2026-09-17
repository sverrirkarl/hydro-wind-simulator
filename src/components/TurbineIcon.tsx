export default function TurbineIcon({
  spinning,
  maintenance,
}: {
  spinning: boolean;
  maintenance: boolean;
}) {
  const color = maintenance
    ? "text-red-500"
    : spinning
      ? "text-emerald-600"
      : "text-slate-400";

  return (
    <div className="flex flex-col items-center">
      <div
        className={`text-2xl leading-none ${color} ${
          spinning && !maintenance
            ? "animate-spin"
            : ""
        }`}
        style={{
          animationDuration: "2.5s",
        }}
      >
        ✣
      </div>

      <div
        className={`h-5 w-0.5 ${
          maintenance
            ? "bg-red-400"
            : "bg-slate-500"
        }`}
      />
    </div>
  );
}