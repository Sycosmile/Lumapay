type Deposit = {
  id: string;
  amount: number;
  status: "pending" | "confirmed" | "failed";
  createdAt: Date;
};

type Props = {
  deposits: Deposit[];
};

export default function DepositHistory({ deposits }: Props) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-2xl font-bold">
            Recent Deposits
          </h2>

          <p className="mt-2 text-gray-400">
            Your latest wallet funding activity.
          </p>
        </div>

      </div>

      {deposits.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/10 py-16 text-center">

          <p className="text-lg font-medium">
            No deposits yet
          </p>

          <p className="mt-3 text-gray-400">
            Your deposits will appear here automatically.
          </p>

        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">

          <table className="w-full">

            <thead className="bg-white/5">

              <tr className="text-left text-sm text-gray-400">

                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>

              </tr>

            </thead>

            <tbody>

              {deposits.map((deposit) => (
                <tr
                  key={deposit.id}
                  className="border-t border-white/10"
                >

                  <td className="px-6 py-5 font-semibold">
                    ${deposit.amount.toFixed(2)}
                  </td>

                  <td className="px-6 py-5">

                    <span
                      className={`
                        rounded-full
                        px-3
                        py-1
                        text-xs
                        font-medium
                        ${
                          deposit.status === "confirmed"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : deposit.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-red-500/20 text-red-400"
                        }
                      `}
                    >
                      {deposit.status}
                    </span>

                  </td>

                  <td className="px-6 py-5 text-gray-400">
                    {deposit.createdAt.toLocaleString()}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>
      )}

    </section>
  );
}