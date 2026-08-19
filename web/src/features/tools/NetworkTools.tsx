"use client";

import { FormEvent, useState } from "react";

import {
  checkMembership,
  detectOverlaps,
  type MembershipResult,
  type OverlapConflict,
} from "@/lib/networking";

export function NetworkTools() {
  const [networkText, setNetworkText] = useState(
    "192.168.1.0/24\n192.168.1.128/25\n192.168.2.0/24",
  );
  const [conflicts, setConflicts] = useState<readonly OverlapConflict[]>([]);
  const [overlapChecked, setOverlapChecked] = useState(false);
  const [overlapError, setOverlapError] = useState("");
  const [ip, setIp] = useState("192.168.1.50");
  const [network, setNetwork] = useState("192.168.1.0/24");
  const [membership, setMembership] = useState<MembershipResult | null>(null);
  const [membershipError, setMembershipError] = useState("");

  function checkOverlaps(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    try {
      setConflicts(detectOverlaps(networkText.split(/\r?\n/)));
      setOverlapChecked(true);
      setOverlapError("");
    } catch (error) {
      setConflicts([]);
      setOverlapChecked(true);
      setOverlapError(
        error instanceof Error
          ? error.message
          : "Unable to inspect these networks.",
      );
    }
  }

  function checkAddress(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    try {
      setMembership(checkMembership(ip, network));
      setMembershipError("");
    } catch (error) {
      setMembership(null);
      setMembershipError(
        error instanceof Error
          ? error.message
          : "Unable to check this address.",
      );
    }
  }

  return (
    <section className="tools-grid" aria-label="Network validation tools">
      <article className="tool-panel compact-panel">
        <p className="eyebrow">Overlap detector</p>
        <h2>Find conflicting CIDRs.</h2>
        <form onSubmit={checkOverlaps}>
          <label htmlFor="overlap-networks">
            One strict network CIDR per line
          </label>
          <textarea
            id="overlap-networks"
            value={networkText}
            onChange={(event) => {
              setNetworkText(event.target.value);
              setOverlapChecked(false);
              setConflicts([]);
              setOverlapError("");
            }}
            rows={6}
            aria-describedby="overlap-error"
          />
          <button className="button button-primary" type="submit">
            Check overlaps
          </button>
        </form>
        {overlapError ? (
          <p className="form-error" id="overlap-error" role="alert">
            {overlapError}
          </p>
        ) : null}
        <div role="status" aria-live="polite" aria-atomic="true">
          {!overlapChecked ? (
            <p className="info-notice">
              Run the checker to analyze the current list.
            </p>
          ) : null}
          {overlapChecked && !overlapError && conflicts.length === 0 ? (
            <p className="success-notice">
              No overlaps found in the checked networks.
            </p>
          ) : null}
          {overlapChecked && !overlapError
            ? conflicts.map((conflict, index) => (
                <div
                  className="conflict-card"
                  key={`${conflict.firstNetwork}-${conflict.secondNetwork}-${index}`}
                >
                  <strong>
                    {conflict.firstNetwork} ↔ {conflict.secondNetwork}
                  </strong>
                  <code>
                    {conflict.overlapStart} — {conflict.overlapEnd}
                  </code>
                  <p>{conflict.reason}</p>
                </div>
              ))
            : null}
        </div>
      </article>

      <article className="tool-panel compact-panel">
        <p className="eyebrow">Membership checker</p>
        <h2>Does this address belong?</h2>
        <form onSubmit={checkAddress} className="stacked-form">
          <label htmlFor="membership-ip">
            IPv4 address
            <input
              id="membership-ip"
              value={ip}
              onChange={(event) => {
                setIp(event.target.value);
                setMembership(null);
                setMembershipError("");
              }}
            />
          </label>
          <label htmlFor="membership-network">
            Strict network CIDR
            <input
              id="membership-network"
              value={network}
              onChange={(event) => {
                setNetwork(event.target.value);
                setMembership(null);
                setMembershipError("");
              }}
            />
          </label>
          <button className="button button-primary" type="submit">
            Check membership
          </button>
        </form>
        {membershipError ? (
          <p className="form-error" role="alert">
            {membershipError}
          </p>
        ) : null}
        <div role="status" aria-live="polite" aria-atomic="true">
          {membership ? (
            <div
              className={
                membership.belongs
                  ? "membership-result belongs"
                  : "membership-result outside"
              }
            >
              <span>
                {membership.belongs ? "Belongs to network" : "Outside network"}
              </span>
              <strong>{membership.ip}</strong>
              <dl>
                <div>
                  <dt>Network</dt>
                  <dd>{membership.network}</dd>
                </div>
                <div>
                  <dt>Broadcast</dt>
                  <dd>{membership.broadcast}</dd>
                </div>
                <div>
                  <dt>Host range</dt>
                  <dd>
                    {membership.firstUsable} — {membership.lastUsable}
                  </dd>
                </div>
              </dl>
              <p>{membership.explanation}</p>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
