import type { TreeFile, TreeNode } from "@/lib/types";

function node(partial: Omit<TreeNode, "children">, children: TreeNode[] = []): TreeNode {
  return { ...partial, children };
}

const sampleRoot: TreeNode = node(
  { id: "root", label: "Sample Regression Suite", type: "suite" },
  [
    node({ id: "feature-auth", label: "Authentication", type: "feature" }, [
      node({ id: "scenario-login", label: "Login", type: "scenario" }, [
        node({
          id: "tc-login-valid",
          label: "Valid credentials sign in",
          type: "testcase",
          status: "passed",
          notes: "Covers the happy path with a known-good account.",
        }),
        node({
          id: "tc-login-invalid",
          label: "Invalid password is rejected",
          type: "testcase",
          status: "passed",
        }),
        node({
          id: "tc-login-lockout",
          label: "Account locks after repeated failures",
          type: "testcase",
          status: "failed",
          notes: "Lockout threshold changed recently — verify against current spec.",
        }),
      ]),
      node({ id: "scenario-recovery", label: "Password recovery", type: "scenario" }, [
        node({
          id: "tc-recovery-email",
          label: "Recovery email is sent",
          type: "testcase",
          status: "passed",
        }),
        node({
          id: "tc-recovery-expired",
          label: "Expired recovery link is rejected",
          type: "testcase",
          status: "blocked",
          notes: "Blocked on a test-environment clock-skew issue.",
        }),
      ]),
    ]),
    node({ id: "feature-checkout", label: "Checkout", type: "feature" }, [
      node({ id: "scenario-cart", label: "Cart totals", type: "scenario" }, [
        node({
          id: "tc-cart-tax",
          label: "Tax is calculated per region",
          type: "testcase",
          status: "passed",
        }),
        node({
          id: "tc-cart-discount",
          label: "Discount codes stack correctly",
          type: "testcase",
          status: "not-run",
        }),
      ]),
      node({ id: "scenario-payment", label: "Payment", type: "scenario" }, [
        node({
          id: "tc-payment-decline",
          label: "Declined card shows a clear error",
          type: "testcase",
          status: "pending",
          notes: "Waiting on updated copy from design.",
        }),
      ]),
    ]),
  ],
);

const DEFAULT_PLATFORM_ID = "sample-platform-default";

export const sampleTree: TreeFile = {
  schemaVersion: 2,
  id: "sample-tree",
  name: "Sample Regression Suite",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  platforms: [
    {
      id: DEFAULT_PLATFORM_ID,
      name: "Default",
      root: sampleRoot,
      snapshots: [],
    },
  ],
  activePlatformId: DEFAULT_PLATFORM_ID,
};
