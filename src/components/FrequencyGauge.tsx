const clamp = (
  value: number,
  minimum: number,
  maximum: number
) => Math.min(maximum, Math.max(minimum, value));

export default function FrequencyGauge({
  frequency,
}: {
  frequency: number;
}) {
  const displayedFrequency = clamp(
    frequency,
    49,
    51
  );

  const normalized =
    (displayedFrequency - 49) / 2;

  const angle =
    -180 + normalized * 180;

  const radians =
    (angle * Math.PI) / 180;

  /*
   * The gauge has deliberately been moved downward.
   * This creates clear space above the green arc for
   * the 50 Hz target label.
   */
  const centerX = 120;
  const centerY = 125;
  const needleLength = 70;

  const needleX =
    centerX +
    needleLength * Math.cos(radians);

  const needleY =
    centerY +
    needleLength * Math.sin(radians);

  const stable =
    frequency >= 49.8 &&
    frequency <= 50.2;

  const warning =
    !stable &&
    frequency >= 49.5 &&
    frequency <= 50.5;

  const status = stable
    ? "Stable"
    : warning
      ? "Warning"
      : "Critical";

  const color = stable
    ? "text-green-600"
    : warning
      ? "text-amber-500"
      : "text-red-600";

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 240 150"
        className="w-full max-w-72"
      >
        {/* Target frequency label */}
        <text
          x="120"
          y="15"
          textAnchor="middle"
          fill="#475569"
          fontSize="12"
          fontWeight="600"
        >
          50 Hz
        </text>

        {/* Critical low-frequency zone */}
        <path
          d="M 32 125 A 88 88 0 0 1 58 63"
          fill="none"
          stroke="#ef4444"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Warning low-frequency zone */}
        <path
          d="M 60 61 A 88 88 0 0 1 94 40"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Stable frequency zone */}
        <path
          d="M 97 39 A 88 88 0 0 1 143 39"
          fill="none"
          stroke="#22c55e"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Warning high-frequency zone */}
        <path
          d="M 146 40 A 88 88 0 0 1 180 61"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Critical high-frequency zone */}
        <path
          d="M 182 63 A 88 88 0 0 1 208 125"
          fill="none"
          stroke="#ef4444"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="#0f172a"
          strokeWidth="5"
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Needle pivot */}
        <circle
          cx={centerX}
          cy={centerY}
          r="8"
          fill="#0f172a"
        />

        {/* Minimum frequency */}
        <text
          x="20"
          y="147"
          fill="#64748b"
          fontSize="11"
        >
          49 Hz
        </text>

        {/* Maximum frequency */}
        <text
          x="188"
          y="147"
          fill="#64748b"
          fontSize="11"
        >
          51 Hz
        </text>
      </svg>

      {/* Current measured frequency */}
      <p
        className={`-mt-1 text-4xl font-bold ${color}`}
      >
        {frequency.toFixed(2)} Hz
      </p>

      {/* Operating status */}
      <p
        className={`mt-1 font-semibold uppercase tracking-wide ${color}`}
      >
        {status}
      </p>
    </div>
  );
}