/** Keep every answer and the recommendation request when assembling a completed questionnaire. */
export function buildProfilingBrief(
  answers: { question: string; answer: string }[],
) {
  const summary = answers
    .map(
      (entry, index) =>
        `Question ${index + 1}: ${entry.question}\nAnswer: ${entry.answer}`,
    )
    .join("\n\n");
  return `${summary}\n\nThese are the project and room specifications — from all the products, please recommend the 3 best tiles.`;
}
