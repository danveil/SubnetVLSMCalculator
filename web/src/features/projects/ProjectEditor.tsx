"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { saveProjectAction } from "@/app/dashboard/actions";
import {
  initialProjectActionState,
  type ProjectActionState,
} from "@/features/projects/action-state";
import {
  allocateVlsm,
  type VlsmPlan,
  type VlsmRequirement,
} from "@/lib/networking";

import { consumeProjectDraft } from "./draft";

import styles from "./projects.module.css";

interface ProjectEditorProps {
  readonly projectId?: string;
  readonly initialName: string;
  readonly initialDescription: string;
  readonly initialBaseNetwork: string;
  readonly initialRequirements: readonly VlsmRequirement[];
  readonly restoreCalculatorDraft?: boolean;
}

function createRequirement(copy?: VlsmRequirement): VlsmRequirement {
  return {
    id: crypto.randomUUID(),
    name: copy ? `${copy.name} copy` : "New network",
    requiredHosts: copy?.requiredHosts ?? 10,
    pointToPoint: copy?.pointToPoint ?? false,
  };
}

export function ProjectEditor({
  projectId,
  initialName,
  initialDescription,
  initialBaseNetwork,
  initialRequirements,
  restoreCalculatorDraft = false,
}: ProjectEditorProps) {
  const [state, formAction, pending] = useActionState<
    ProjectActionState,
    FormData
  >(saveProjectAction, initialProjectActionState);
  const [baseNetwork, setBaseNetwork] = useState(initialBaseNetwork);
  const [requirements, setRequirements] =
    useState<readonly VlsmRequirement[]>(initialRequirements);

  useEffect(() => {
    if (!restoreCalculatorDraft) return;
    try {
      const draft = consumeProjectDraft(window.localStorage);
      if (!draft) return;
      queueMicrotask(() => {
        setBaseNetwork(draft.baseNetwork);
        setRequirements(draft.requirements);
      });
    } catch {
      // Malformed or expired drafts are consumed and the defaults stay visible.
    }
  }, [restoreCalculatorDraft]);
  const calculation = useMemo<{ plan: VlsmPlan | null; error: string }>(() => {
    try {
      return { plan: allocateVlsm(baseNetwork, requirements), error: "" };
    } catch (error) {
      return {
        plan: null,
        error:
          error instanceof Error ? error.message : "Unable to calculate plan.",
      };
    }
  }, [baseNetwork, requirements]);

  function updateRequirement(
    id: string,
    patch: Partial<VlsmRequirement>,
  ): void {
    setRequirements((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function moveRequirement(id: string, direction: -1 | 1): void {
    setRequirements((current) => {
      const index = current.findIndex((item) => item.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  }

  return (
    <form action={formAction} className={styles.editor}>
      {projectId ? (
        <input name="projectId" type="hidden" value={projectId} />
      ) : null}
      <input
        name="requirements"
        type="hidden"
        value={JSON.stringify(requirements)}
      />

      <div className={styles.fields}>
        <label>
          Project name
          <input
            autoComplete="off"
            defaultValue={initialName}
            maxLength={80}
            name="name"
            required
          />
        </label>
        <label>
          Parent network
          <input
            autoComplete="off"
            name="baseNetwork"
            onChange={(event) => setBaseNetwork(event.target.value)}
            required
            value={baseNetwork}
          />
        </label>
        <label className={styles.description}>
          Description
          <textarea
            defaultValue={initialDescription}
            maxLength={500}
            name="description"
            rows={3}
          />
        </label>
      </div>

      <div className={styles.headingRow}>
        <div>
          <p className="eyebrow">Network requirements</p>
          <h2>Define the address plan</h2>
        </div>
        <button
          className="button button-secondary"
          onClick={() =>
            setRequirements((current) => [...current, createRequirement()])
          }
          type="button"
        >
          Add network
        </button>
      </div>

      <div className="table-scroll">
        <table className="data-table input-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Required hosts</th>
              <th>Point-to-point</th>
              <th>Calculated CIDR</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((requirement, index) => {
              const allocation = calculation.plan?.allocations.find(
                (item) => item.requirementId === requirement.id,
              );
              return (
                <tr key={requirement.id}>
                  <td>
                    <input
                      aria-label={`Network name row ${index + 1}`}
                      maxLength={80}
                      onChange={(event) =>
                        updateRequirement(requirement.id, {
                          name: event.target.value,
                        })
                      }
                      required
                      value={requirement.name}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Required hosts for ${requirement.name}`}
                      min={1}
                      onChange={(event) =>
                        updateRequirement(requirement.id, {
                          requiredHosts: Number(event.target.value),
                        })
                      }
                      required
                      type="number"
                      value={requirement.requiredHosts}
                    />
                  </td>
                  <td>
                    <label className="compact-check">
                      <input
                        aria-label={`Use RFC 3021 for ${requirement.name}`}
                        checked={requirement.pointToPoint ?? false}
                        onChange={(event) =>
                          updateRequirement(requirement.id, {
                            pointToPoint: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                      <span>RFC 3021</span>
                    </label>
                  </td>
                  <td>
                    <code>{allocation?.cidr ?? "Pending"}</code>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label={`Move ${requirement.name} up`}
                        disabled={index === 0}
                        onClick={() => moveRequirement(requirement.id, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Move ${requirement.name} down`}
                        disabled={index === requirements.length - 1}
                        onClick={() => moveRequirement(requirement.id, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() =>
                          setRequirements((current) => {
                            const next = [...current];
                            next.splice(
                              index + 1,
                              0,
                              createRequirement(requirement),
                            );
                            return next;
                          })
                        }
                        type="button"
                      >
                        Duplicate
                      </button>
                      <button
                        className="danger"
                        disabled={requirements.length === 1}
                        onClick={() =>
                          setRequirements((current) =>
                            current.filter(
                              (item) => item.id !== requirement.id,
                            ),
                          )
                        }
                        type="button"
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
        <p className="form-error" role="alert">
          {calculation.error}
        </p>
      ) : null}
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      {calculation.plan ? (
        <div className={styles.summary}>
          <strong>Validated plan</strong>
          <span>{calculation.plan.allocations.length} allocated subnets</span>
          <span>
            {calculation.plan.metrics.unallocatedAddresses.toLocaleString()}{" "}
            free addresses
          </span>
        </div>
      ) : null}

      <div className={styles.actions}>
        <Link className="button button-secondary" href="/dashboard">
          Cancel
        </Link>
        <button
          className="button button-primary"
          disabled={pending || !calculation.plan}
          type="submit"
        >
          {pending ? "Saving…" : projectId ? "Save changes" : "Create project"}
        </button>
      </div>
    </form>
  );
}
