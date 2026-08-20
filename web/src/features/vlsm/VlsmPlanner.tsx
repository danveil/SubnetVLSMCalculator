"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CopyButton } from "@/components/CopyButton";
import { MetricCard } from "@/components/MetricCard";
import {
  AddressingTable,
  type AddressingEdits,
  type AddressingField,
} from "@/features/addressing/AddressingTable";
import {
  allocateVlsm,
  prefixForHostRequirement,
  type VlsmPlan,
  type VlsmRequirement,
  vlsmPlanToCsv,
} from "@/lib/networking";
import { storeProjectDraft } from "@/features/projects/draft";
import { downloadTextFile } from "@/utils/download";

import { AllocationMap } from "./AllocationMap";

const example: readonly VlsmRequirement[] = [
  { id: "students", name: "Students", requiredHosts: 500 },
  { id: "staff", name: "Staff", requiredHosts: 120 },
  { id: "servers", name: "Servers", requiredHosts: 50 },
  { id: "cctv", name: "CCTV", requiredHosts: 30 },
  { id: "management", name: "Management", requiredHosts: 12 },
  { id: "wan-a", name: "WAN-A", requiredHosts: 2, pointToPoint: true },
];

function newRequirement(copy?: VlsmRequirement): VlsmRequirement {
  return {
    id: crypto.randomUUID(),
    name: copy ? `${copy.name} copy` : "New network",
    requiredHosts: copy?.requiredHosts ?? 10,
    pointToPoint: copy?.pointToPoint ?? false,
  };
}

export function VlsmPlanner() {
  const router = useRouter();
  const [parent, setParent] = useState("10.10.0.0/16");
  const [requirements, setRequirements] =
    useState<readonly VlsmRequirement[]>(example);
  const [showWorking, setShowWorking] = useState(false);
  const [draftHandoffError, setDraftHandoffError] = useState("");
  const [addressingEdits, setAddressingEdits] = useState<AddressingEdits>({});
  const calculation = useMemo<{ plan: VlsmPlan | null; error: string }>(() => {
    try {
      return { plan: allocateVlsm(parent, requirements), error: "" };
    } catch (error) {
      return {
        plan: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to allocate this plan.",
      };
    }
  }, [parent, requirements]);
  const allocationById = useMemo(
    () =>
      new Map(
        calculation.plan?.allocations.map((item) => [item.requirementId, item]),
      ),
    [calculation.plan],
  );

  function update(id: string, patch: Partial<VlsmRequirement>): void {
    setRequirements((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }
  function updateAddressing(
    id: string,
    field: AddressingField,
    value: string,
  ): void {
    setAddressingEdits((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }
  function remove(id: string): void {
    setRequirements((current) => current.filter((row) => row.id !== id));
  }
  function duplicate(id: string): void {
    setRequirements((current) => {
      const index = current.findIndex((row) => row.id === id);
      if (index < 0) return current;
      const rows = [...current];
      rows.splice(index + 1, 0, newRequirement(current[index]));
      return rows;
    });
  }
  function move(id: string, direction: -1 | 1): void {
    setRequirements((current) => {
      const index = current.findIndex((row) => row.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length)
        return current;
      const rows = [...current];
      [rows[index], rows[destination]] = [rows[destination]!, rows[index]!];
      return rows;
    });
  }

  return (
    <section className="tool-panel" aria-labelledby="vlsm-planner-title">
      <div className="tool-heading">
        <div>
          <p className="eyebrow">VLSM planner</p>
          <h2 id="vlsm-planner-title">Shape a complete address plan.</h2>
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showWorking}
            onChange={(event) => setShowWorking(event.target.checked)}
          />{" "}
          Show working
        </label>
      </div>

      <div className="planner-toolbar">
        <label>
          Parent network
          <input
            value={parent}
            onChange={(event) => setParent(event.target.value)}
            aria-describedby="vlsm-error"
          />
        </label>
        <div className="toolbar-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() =>
              setRequirements((current) => [...current, newRequirement()])
            }
          >
            Add network
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setRequirements(example);
              setAddressingEdits({});
            }}
          >
            Load example
          </button>
          <button
            className="text-button danger"
            type="button"
            onClick={() => {
              setRequirements([]);
              setAddressingEdits({});
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="table-scroll requirement-editor">
        <table className="data-table input-table">
          <thead>
            <tr>
              <th>Network name</th>
              <th>Required hosts</th>
              <th>Point-to-point</th>
              <th>Calculated prefix</th>
              <th>Allocated network</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((row, index) => {
              let prefix = "—";
              try {
                prefix = `/${prefixForHostRequirement(row.requiredHosts, row.pointToPoint)}`;
              } catch {
                /* displayed by plan error */
              }
              return (
                <tr key={row.id}>
                  <td>
                    <input
                      aria-label={`Network name row ${index + 1}`}
                      value={row.name}
                      onChange={(event) =>
                        update(row.id, { name: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Required hosts for ${row.name}`}
                      min="1"
                      type="number"
                      value={row.requiredHosts}
                      onChange={(event) =>
                        update(row.id, {
                          requiredHosts: Number(event.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <label className="compact-check">
                      <input
                        type="checkbox"
                        aria-label={`Use RFC 3021 for ${row.name}`}
                        checked={row.pointToPoint ?? false}
                        onChange={(event) =>
                          update(row.id, { pointToPoint: event.target.checked })
                        }
                      />
                      <span>RFC 3021</span>
                    </label>
                  </td>
                  <td>
                    <code>{prefix}</code>
                  </td>
                  <td>
                    <code>{allocationById.get(row.id)?.cidr ?? "Pending"}</code>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => move(row.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${row.name} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(row.id, 1)}
                        disabled={index === requirements.length - 1}
                        aria-label={`Move ${row.name} down`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicate(row.id)}
                        aria-label={`Duplicate ${row.name}`}
                      >
                        Duplicate
                      </button>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => remove(row.id)}
                        aria-label={`Delete ${row.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {calculation.error ? (
        <p className="form-error" id="vlsm-error" role="alert">
          {calculation.error}
        </p>
      ) : null}
      {draftHandoffError ? (
        <p className="form-error" role="alert">
          {draftHandoffError}
        </p>
      ) : null}
      {calculation.plan ? (
        <>
          <div className="metrics-grid">
            <MetricCard
              label="Parent addresses"
              value={calculation.plan.metrics.parentTotalAddresses.toLocaleString()}
              help="Every address inside the parent CIDR, including reserved network and broadcast addresses."
            />
            <MetricCard
              label="Allocated"
              value={`${calculation.plan.metrics.addressSpaceUtilizationPercentage}%`}
              help="Allocated address blocks divided by all addresses in the parent network."
            />
            <MetricCard
              label="Efficiency"
              value={`${calculation.plan.metrics.allocationEfficiencyPercentage}%`}
              help="Requested hosts divided by usable host capacity in the allocated subnets."
            />
            <MetricCard
              label="Unallocated"
              value={calculation.plan.metrics.unallocatedAddresses.toLocaleString()}
              help="Parent addresses that remain outside every allocated subnet block."
            />
          </div>

          <AllocationMap plan={calculation.plan} />

          <div className="results-heading">
            <div>
              <p className="eyebrow">Allocation results</p>
              <h3>Largest-first, boundary-aligned subnets</h3>
            </div>
            <div className="toolbar-actions">
              <button
                className="button button-secondary"
                onClick={() => {
                  try {
                    storeProjectDraft(window.localStorage, {
                      baseNetwork: parent,
                      requirements,
                    });
                    router.push("/dashboard/new");
                  } catch {
                    setDraftHandoffError(
                      "Your browser blocked temporary draft storage. Allow site storage, then try again.",
                    );
                  }
                }}
                type="button"
              >
                Save online
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() =>
                  downloadTextFile(
                    vlsmPlanToCsv(calculation.plan!),
                    "subnetforge-vlsm-plan.csv",
                    "text/csv;charset=utf-8",
                  )
                }
              >
                Export CSV
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table results-table">
              <thead>
                <tr>
                  <th>Network</th>
                  <th>Need</th>
                  <th>Capacity</th>
                  <th>CIDR</th>
                  <th>Mask</th>
                  <th>First host</th>
                  <th>Last host</th>
                  <th>Broadcast</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {calculation.plan.allocations.map((item) => (
                  <tr key={item.requirementId}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.requiredHosts}</td>
                    <td>{item.capacity}</td>
                    <td>
                      <code>{item.cidr}</code>
                      <CopyButton value={item.cidr} />
                    </td>
                    <td>
                      <code>{item.subnetMask}</code>
                    </td>
                    <td>
                      <code>{item.firstUsable}</code>
                    </td>
                    <td>
                      <code>{item.lastUsable}</code>
                    </td>
                    <td>
                      <code>{item.broadcast}</code>
                    </td>
                    <td>{item.utilizationPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showWorking ? (
            <div className="working-list">
              {calculation.plan.allocations.map((item, index) => (
                <article key={item.requirementId}>
                  <span>Step {index + 1}</span>
                  <h4>
                    {item.name} → {item.cidr}
                  </h4>
                  <ol>
                    {item.explanation.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          ) : null}
          <AddressingTable
            plan={calculation.plan}
            edits={addressingEdits}
            onEdit={updateAddressing}
          />
        </>
      ) : null}
    </section>
  );
}
