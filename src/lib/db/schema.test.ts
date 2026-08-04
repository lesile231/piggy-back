import { describe, it, expect } from "vitest";
import * as schema from "./schema";

describe("schema", () => {
  it("exports all 17 tables", () => {
    const tableNames = [
      "users", "chatSessions", "chatMessages",
      "flows", "flowSteps", "flowOptions",
      "categories", "tourismSpots", "spotCategories", "locationAliases",
      "events",
      "advertisers", "adCampaigns", "adImpressions", "coupons", "couponRedemptions",
      "adminUsers", "adminAuditLogs",
    ];
    for (const name of tableNames) {
      expect(schema).toHaveProperty(name);
    }
  });

  it("users table has platform and platform_uid columns", () => {
    const cols = Object.keys(schema.users);
    expect(cols).toContain("platform");
    expect(cols).toContain("platformUid");
  });
});
