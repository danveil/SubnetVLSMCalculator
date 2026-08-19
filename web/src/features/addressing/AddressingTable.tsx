"use client";

import { useMemo } from "react";

import {
  type AddressAssignment,
  type VlsmPlan,
  validateAddressAssignments,
} from "@/lib/networking";

type EditableAssignment = Pick<
  AddressAssignment,
  "device" | "interfaceName" | "assignedIp" | "gateway"
>;

export type AddressingField = keyof EditableAssignment;
export type AddressingEdits = Readonly<
  Record<string, Partial<EditableAssignment>>
>;

export function AddressingTable({
  plan,
  edits,
  onEdit,
}: {
  plan: VlsmPlan;
  edits: AddressingEdits;
  onEdit: (id: string, field: AddressingField, value: string) => void;
}) {
  const rows = useMemo<AddressAssignment[]>(
    () =>
      plan.allocations.map((allocation) => {
        const edit = edits[allocation.requirementId] ?? {};
        return {
          id: allocation.requirementId,
          subnetCidr: allocation.cidr,
          device: edit.device ?? "",
          interfaceName: edit.interfaceName ?? "",
          assignedIp: edit.assignedIp ?? "",
          gateway: edit.gateway ?? allocation.firstUsable,
        };
      }),
    [edits, plan],
  );
  const issues = useMemo(() => validateAddressAssignments(rows), [rows]);

  return (
    <section className="sub-panel" aria-labelledby="addressing-title">
      <div className="sub-panel-heading">
        <div>
          <p className="eyebrow">Lab addressing table</p>
          <h3 id="addressing-title">Validate user-provided assignments.</h3>
        </div>
        <span
          className={
            issues.length ? "validation-badge invalid" : "validation-badge"
          }
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {issues.length
            ? `${issues.length} issue${issues.length === 1 ? "" : "s"}`
            : "No validation issues"}
        </span>
      </div>
      <p className="section-copy">
        Topology is never invented. Enter the device, interface, and assigned
        IP; calculated subnets validate each value.
      </p>
      <div className="table-scroll">
        <table className="data-table input-table">
          <thead>
            <tr>
              <th>Network</th>
              <th>Device</th>
              <th>Interface</th>
              <th>Assigned IP</th>
              <th>Default gateway</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <code>{row.subnetCidr}</code>
                </td>
                <td>
                  <input
                    aria-label={`Device for ${row.subnetCidr}`}
                    value={row.device}
                    onChange={(event) =>
                      onEdit(row.id, "device", event.target.value)
                    }
                    placeholder="R1"
                  />
                </td>
                <td>
                  <input
                    aria-label={`Interface for ${row.subnetCidr}`}
                    value={row.interfaceName}
                    onChange={(event) =>
                      onEdit(row.id, "interfaceName", event.target.value)
                    }
                    placeholder="G0/0"
                  />
                </td>
                <td>
                  <input
                    aria-label={`Assigned IP for ${row.subnetCidr}`}
                    value={row.assignedIp}
                    onChange={(event) =>
                      onEdit(row.id, "assignedIp", event.target.value)
                    }
                    placeholder="Optional"
                  />
                </td>
                <td>
                  <input
                    aria-label={`Gateway for ${row.subnetCidr}`}
                    value={row.gateway}
                    onChange={(event) =>
                      onEdit(row.id, "gateway", event.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {issues.length ? (
        <ul className="issue-list" aria-live="polite">
          {issues.map((issue, index) => (
            <li key={`${issue.assignmentId}-${issue.field}-${index}`}>
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
