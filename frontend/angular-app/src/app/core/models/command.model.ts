import { Dashboard } from "./dashboard.model";

export interface CommandResult {
  intent: string;
  entities: Record<string, any>;
  action_summary: string;
  updated_dashboard: Dashboard;
}
