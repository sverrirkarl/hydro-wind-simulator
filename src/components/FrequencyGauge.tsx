export default function FrequencyGauge({
  frequency,
}: {
  frequency: number;
}) {
  return (
    <div className="p-6 text-center">
      <div className="text-5xl font-bold text-green-600">
        {frequency.toFixed(2)}
      </div>

      <div className="mt-2 text-gray-500">
        Grid Frequency
      </div>

      <div className="mt-4 h-4 w-full rounded-full bg-gray-200">
        <div
          className="h-4 rounded-full bg-green-500"
          style={{
            width: "75%",
          }}
        />
      </div>
    </div>
  );
}