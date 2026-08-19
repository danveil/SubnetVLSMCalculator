"use client";

import { FormEvent, useMemo, useState } from "react";

import { CopyButton } from "@/components/CopyButton";
import { calculateSubnet, type SubnetAnalysis } from "@/lib/networking";

const fields: readonly [keyof SubnetAnalysis, string][] = [
  ["cidr", "Normalized CIDR"],
  ["subnetMask", "Subnet mask"],
  ["wildcardMask", "Wildcard mask"],
  ["network", "Network address"],
  ["broadcast", "Broadcast address"],
  ["firstUsable", "First usable host"],
  ["lastUsable", "Last usable host"],
  ["totalAddresses", "Total addresses"],
  ["usableHosts", "Usable hosts"],
  ["ipClass", "Educational class"],
];

export function SubnetCalculator() {
  const [draft, setDraft] = useState("192.168.1.10/24");
  const [submitted, setSubmitted] = useState("192.168.1.10/24");
  const [showWorking, setShowWorking] = useState(false);
  const calculation = useMemo(() => {
    try {
      return { result: calculateSubnet(submitted), error: "" };
    } catch (error) {
      return {
        result: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to calculate this subnet.",
      };
    }
  }, [submitted]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(draft);
  }

  return (
    <section className="tool-panel" aria-labelledby="subnet-calculator-title">
      <div className="tool-heading">
        <div>
          <p className="eyebrow">IPv4 subnet calculator</p>
          <h2 id="subnet-calculator-title">Inspect one network precisely.</h2>
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showWorking}
            onChange={(event) => setShowWorking(event.target.checked)}
          />
          Show educational working
        </label>
      </div>

      <form className="inline-form" onSubmit={submit} noValidate>
        <label htmlFor="subnet-cidr">IPv4 address and prefix</label>
        <div className="input-action-row">
          <input
            id="subnet-cidr"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="192.168.1.10/24"
            aria-describedby="subnet-hint subnet-error"
          />
          <button className="button button-primary" type="submit">
            Calculate
          </button>
        </div>
        <small id="subnet-hint">
          Enter four decimal octets and a prefix from /0 through /32.
        </small>
      </form>

      {calculation.error ? (
        <p className="form-error" id="subnet-error" role="alert">
          {calculation.error}
        </p>
      ) : null}
      {calculation.result ? (
        <>
          <div
            className="result-grid"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {fields.map(([key, label]) => {
              const value = String(calculation.result![key]);
              return (
                <div className="result-item" key={key}>
                  <span>{label}</span>
                  <div>
                    <code>{value}</code>
                    <CopyButton value={value} />
                  </div>
                </div>
              );
            })}
          </div>
          {calculation.result.specialUseExplanation ? (
            <p className="info-notice">
              {calculation.result.specialUseExplanation}
            </p>
          ) : null}
          {showWorking ? (
            <div className="working-panel">
              <h3>How the boundary is found</h3>
              <p>
                A /{calculation.result.prefix} uses{" "}
                {calculation.result.networkBits} network bits and{" "}
                {calculation.result.hostBits} host bits. That leaves 2^
                {calculation.result.hostBits} ={" "}
                {calculation.result.totalAddresses.toLocaleString()} addresses
                in the block.
              </p>
              <code>{calculation.result.binaryIp}</code>
              <code>{calculation.result.binaryMask}</code>
              <p>
                Keeping the IP bits where the mask is 1 and clearing the host
                bits produces {calculation.result.network}.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
