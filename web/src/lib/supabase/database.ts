import type { Database as GeneratedDatabase } from "./database.types";

type PublicSchema = GeneratedDatabase["public"];
type GeneratedSaveWorkspace =
  PublicSchema["Functions"]["save_project_workspace"];

// PostgreSQL function parameters are nullable unless declared through a domain,
// but the Supabase type generator cannot currently represent that distinction.
// Keep the generated file untouched and model the two intentionally nullable
// arguments at the application boundary.
type SaveWorkspace = Omit<GeneratedSaveWorkspace, "Args"> & {
  Args: Omit<
    GeneratedSaveWorkspace["Args"],
    "p_project_id" | "p_description"
  > & {
    p_project_id: string | null;
    p_description: string | null;
  };
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Functions"> & {
    Functions: Omit<PublicSchema["Functions"], "save_project_workspace"> & {
      save_project_workspace: SaveWorkspace;
    };
  };
};
