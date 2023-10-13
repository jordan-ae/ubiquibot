import { Payload } from "../../../../types";
import Runtime from "../../../../bindings/bot-runtime";
import { calculateIssueAssigneeReward } from "../../../payout/calculate-issue-assignee-reward";
import { calculateIssueConversationReward } from "../../../payout/calculate-issue-conversation-reward";
import { calculateIssueCreatorReward } from "../../../payout/calculate-issue-creator-reward";
import { calculateReviewContributorRewards } from "../../../payout/calculate-review-contributor-rewards";
import { handleIssueClosed } from "../../../payout/handle-issue-closed";
import { incentivesCalculation } from "../../../payout/incentives-calculation";

// Callback for issues closed - Processor

export async function issueClosedCallback() {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const organization = payload.organization;
  const owner = payload.repository.owner;

  if (!organization) {
    runtime.logger.warn("No organization found in payload, falling back to `owner`");
  }

  const logger = runtime.logger;

  if (!organization) {
    logger.warn("Cannot save permit to DB, missing organization", { organization });
  }
  if (!owner) {
    logger.warn("Cannot save permit to DB, missing owner", { owner });
  }
  if (!organization && !owner) {
    throw logger.error("Cannot save permit to DB, missing organization and owner");
  }

  if (!issue) throw logger.error("Cannot save permit to DB, missing issue");
  // assign function incentivesCalculation to a variable
  const calculateIncentives = await incentivesCalculation();

  const creatorReward = await calculateIssueCreatorReward(calculateIncentives);
  const assigneeReward = await calculateIssueAssigneeReward(calculateIncentives);
  const conversationRewards = await calculateIssueConversationReward(calculateIncentives);
  const pullRequestReviewersReward = await calculateReviewContributorRewards(calculateIncentives);

  const { error } = await handleIssueClosed({
    creatorReward,
    assigneeReward,
    conversationRewards,
    pullRequestReviewersReward,
    incentivesCalculation: calculateIncentives,
    // organization: organization,
    // owner: owner,
  });

  if (error) {
    throw logger.error(error);
  }
}
