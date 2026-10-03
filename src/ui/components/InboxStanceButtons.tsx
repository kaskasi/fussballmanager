import {
  actionIcon,
  actionLabel,
  allowedActions,
  storyChoiceId,
  storyChoiceStance,
  type DecisionAction,
  type DecisionInboxItem,
} from "../../youth/decision-inbox.ts";

/**
 * WIREFRAME: PRD 14.5 — Post
 * [● Überleben]  [▲ Anspruch]
 * Form + Farbe (09.3). Kein "accept".
 */
export function InboxStanceButtons({
  item,
  onChoose,
}: {
  item: DecisionInboxItem;
  onChoose: (action: DecisionAction) => void;
}) {
  const context = { item };
  return (
    <div className="inbox-stances" aria-label="Antworten">
      {allowedActions(item).map((action) => {
        const choiceId = storyChoiceId(action);
        const choice = item.narrative?.choices.find((entry) => entry.id === choiceId);
        const stance = storyChoiceStance(choiceId, choice?.icon);
        return (
          <button
            key={action}
            type="button"
            className={`inbox-stance is-${stance}`}
            onClick={() => onChoose(action)}
          >
            <span className="inbox-stance-form" aria-hidden="true">
              {actionIcon(action, context)}
            </span>
            <span>{actionLabel(action, context)}</span>
          </button>
        );
      })}
    </div>
  );
}
