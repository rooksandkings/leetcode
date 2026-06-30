import type { TestResult } from "@codearena/shared";
import { StatusPill } from "@/components/status-pill";

export function TestResults({ tests }: { tests: TestResult[] }) {
  return (
    <details className="details">
      <summary>Per-test results</summary>
      <div className="details-body">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Visibility</th>
                <th>Verdict</th>
                <th>Runtime</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.testIndex}>
                  <td>#{test.testIndex}</td>
                  <td>{test.visibleToUser ? "public" : "hidden"}</td>
                  <td>
                    <StatusPill verdict={test.status} />
                  </td>
                  <td>{test.runtimeMs} ms</td>
                  <td>{test.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

