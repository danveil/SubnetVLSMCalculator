import Link from "next/link";

import { brand } from "@/config/brand";
import { SubnetCalculator } from "@/features/calculator/SubnetCalculator";
import { NetworkTools } from "@/features/tools/NetworkTools";
import { VlsmPlanner } from "@/features/vlsm/VlsmPlanner";

const previewRows = [
  ["Users", "192.168.10.0/26", "62", "60"],
  ["Servers", "192.168.10.64/27", "30", "30"],
  ["Management", "192.168.10.96/28", "14", "12"],
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={`${brand.name} home`}>
          <span className="brand-mark">SF</span>
          <span>
            <strong>{brand.name}</strong>
            <small>Address planning workspace</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workspace">Calculator</a>
          <a href="#vlsm">VLSM</a>
          <a href="#validation-tools">Validate</a>
          <a href="#features">Features</a>
          <Link href="/dashboard">Projects</Link>
          <Link href="/login">Sign in</Link>
          <span className="status-pill">Local-first</span>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            IPv4 planning · deterministic · private by default
          </p>
          <h1>{brand.headline}</h1>
          <p className="hero-lede">{brand.description}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#workspace">
              Open the calculator
            </a>
            <a className="button button-secondary" href="#features">
              Explore capabilities
            </a>
          </div>
          <dl className="trust-strip">
            <div>
              <dt>No login wall</dt>
              <dd>Core calculators stay open</dd>
            </div>
            <div>
              <dt>No network API</dt>
              <dd>Math runs in your browser</dd>
            </div>
            <div>
              <dt>Explainable</dt>
              <dd>See how every prefix is chosen</dd>
            </div>
          </dl>
        </div>

        <div
          className="terminal-card"
          aria-label="Example VLSM allocation preview"
        >
          <div className="terminal-bar">
            <span>VLSM plan</span>
            <code>192.168.10.0/24</code>
          </div>
          <div className="terminal-grid terminal-head" aria-hidden="true">
            <span>Network</span>
            <span>CIDR</span>
            <span>Capacity</span>
            <span>Need</span>
          </div>
          {previewRows.map(([name, cidr, capacity, need]) => (
            <div className="terminal-grid" key={name}>
              <strong>{name}</strong>
              <code>{cidr}</code>
              <span>{capacity}</span>
              <span>{need}</span>
            </div>
          ))}
          <div
            className="address-map"
            aria-label="Example address-space visualization"
          >
            <span style={{ flex: 4 }}>Users /26</span>
            <span style={{ flex: 2 }}>Servers /27</span>
            <span style={{ flex: 1 }}>Mgmt /28</span>
            <span className="map-free" style={{ flex: 9 }}>
              Unallocated
            </span>
          </div>
          <p className="terminal-note">
            Reference preview · interactive engine follows next
          </p>
        </div>
      </section>

      <section className="workspace-intro" id="workspace">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>Technical tools, not marketing obstacles.</h2>
        </div>
        <p>
          The web workspace runs alongside the tested Python CLI. The same
          subnet and VLSM rules power browser tools without sending private
          network plans to a server.
        </p>
      </section>

      <div className="workspace-shell">
        <SubnetCalculator />
        <div id="vlsm">
          <VlsmPlanner />
        </div>
        <div id="validation-tools">
          <NetworkTools />
        </div>
      </div>

      <section
        className="feature-grid"
        id="features"
        aria-label="Workspace tools"
      >
        {[
          [
            "01",
            "Subnet calculator",
            "Inspect masks, ranges, binary boundaries, /31, and /32 behavior.",
          ],
          [
            "02",
            "VLSM planner",
            "Edit requirements, allocate largest-first, and explain every boundary.",
          ],
          [
            "03",
            "Overlap detector",
            "Find conflicting CIDRs and identify the exact shared address range.",
          ],
          [
            "04",
            "Export workspace",
            "Create clean CSV plans and validate lab addressing assignments.",
          ],
        ].map(([number, title, copy]) => (
          <article className="feature-card" key={number}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="audience-section">
        <div>
          <p className="eyebrow">Built for real learning and planning</p>
          <h2>From first subnet to defensible address plan.</h2>
        </div>
        <div className="audience-list">
          <article>
            <strong>Networking students</strong>
            <p>
              See binary boundaries and the exact power-of-two reasoning behind
              each prefix.
            </p>
          </article>
          <article>
            <strong>Educators</strong>
            <p>
              Use known-answer examples and transparent working instead of
              unexplained output.
            </p>
          </article>
          <article>
            <strong>Homelab builders</strong>
            <p>
              Plan VLANs and validate assignments without sharing private
              addressing data.
            </p>
          </article>
          <article>
            <strong>IT teams</strong>
            <p>
              Review compact VLSM tables, address-space waste, overlaps, and CSV
              exports.
            </p>
          </article>
        </div>
      </section>

      <section className="pricing-section" aria-labelledby="pricing-title">
        <div>
          <p className="eyebrow">Product direction</p>
          <h2 id="pricing-title">Useful before you ever create an account.</h2>
          <p>
            Core calculation remains free and local. Accounts add a private
            cloud workspace without placing a login wall around the tools.
          </p>
        </div>
        <div className="pricing-cards">
          <article>
            <span>Free</span>
            <strong>Local workspace</strong>
            <ul>
              <li>Subnet calculator</li>
              <li>VLSM planner</li>
              <li>Overlap and membership tools</li>
              <li>CSV export</li>
            </ul>
            <a className="button button-primary" href="#workspace">
              Use the workspace
            </a>
          </article>
          <article className="future-plan">
            <span>Account workspace</span>
            <strong>Private saved projects</strong>
            <ul>
              <li>Three saved projects on the free plan</li>
              <li>Private requirements and address plans</li>
              <li>Server-revalidated calculations</li>
              <li>Row-level ownership controls</li>
            </ul>
            <Link className="button button-secondary" href="/dashboard">
              Open saved projects
            </Link>
          </article>
        </div>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <p className="eyebrow">FAQ</p>
        <h2 id="faq-title">Important boundaries</h2>
        <div className="faq-grid">
          <details>
            <summary>Does SubnetForge upload my network plan?</summary>
            <p>
              No. The current web calculators run deterministically in the
              browser and make no calculation API requests.
            </p>
          </details>
          <details>
            <summary>Why does a /31 show two usable addresses?</summary>
            <p>
              RFC 3021 permits both addresses on an explicitly point-to-point
              link. Ordinary LAN requirements still reserve network and
              broadcast addresses.
            </p>
          </details>
          <details>
            <summary>Can I deploy generated device configuration?</summary>
            <p>
              Configuration helpers are review-required templates. Verify
              topology, platform syntax, routing, ACLs, and organizational
              policy before use.
            </p>
          </details>
          <details>
            <summary>Can I save projects online?</summary>
            <p>
              Yes. Create an account to save private projects. The calculator
              remains available without signing in.
            </p>
          </details>
        </div>
      </section>

      <footer>
        <div className="brand">
          <span className="brand-mark">SF</span>
          <span>
            <strong>{brand.name}</strong>
            <small>{brand.productCategory}</small>
          </span>
        </div>
        <p>Correctness first. Security second. Usability third.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
