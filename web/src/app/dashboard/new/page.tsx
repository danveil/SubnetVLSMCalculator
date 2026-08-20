import { redirect } from "next/navigation";

import { ProjectEditor } from "@/features/projects/ProjectEditor";
import { getVerifiedUser } from "@/lib/supabase/auth";

export default async function NewProjectPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login?next=/dashboard/new");

  return (
    <>
      <p className="eyebrow">New cloud project</p>
      <h1>Create a saved address plan</h1>
      <ProjectEditor
        initialBaseNetwork="10.10.0.0/16"
        initialDescription=""
        initialName="Untitled project"
        initialRequirements={[
          {
            id: "b9919389-50f9-462f-94bd-628e4bfab09d",
            name: "Users",
            requiredHosts: 100,
          },
        ]}
        restoreCalculatorDraft
      />
    </>
  );
}
