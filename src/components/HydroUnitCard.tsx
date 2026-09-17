import {
  HYDRO_UNIT_CAPACITY,
} from "../simulation/constants";

export default function HydroUnitCard({
  name,
  output,
  maintenance,
}: {
  name: string;
  output: number;
  maintenance: boolean;
}) {
  const percentage = Math.min(
    100,
    (output / HYDRO_UNIT_CAPACITY) * 100
  );

  return (
    <div
      className={`rounded-xl border p-5 ${
        maintenance
          ? "border-red-200 bg-red-50"
          : "border-blue-200 bg-blue-50"
      }`}
    >
      <div className="flex justify-between">
        <h3 className="font-bold">
          {name}
        </h3>

        <span>
          {maintenance
            ? "Maintenance"
            : output > 0
              ? "Generating"
              : "Available"}
        </span>
      </div>

      <div className="mt-5 text-3xl font-bold">
        {Math.round(output)} MW
      </div>

      <p>
        of {HYDRO_UNIT_CAPACITY} MW
      </p>

      <div className="mt-4 h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={
            maintenance
              ? "h-full bg-red-500"
              : "h-full bg-blue-600"
          }
          style={{
            width: maintenance
              ? "100%"
              : `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}