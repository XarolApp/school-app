import CommuteControl from './CommuteControl';

/**
 * The questionnaire's `dojezd_*` questions as one control. Adapts the shared
 * CommuteControl to the questionnaire's answer keys; `questions` carries the
 * server-defined strictness question (label and options).
 */
function CommuteQuestion({ answers, setAnswers, questions, track }) {
  const strictQuestion = questions.dojezd_prisnost;
  const onChange = (patch) => setAnswers((prev) => {
    const next = { ...prev };
    if ('stop' in patch) next.dojezd_zastavka = patch.stop;
    if ('limit' in patch) next.dojezd_limit = patch.limit ?? '';
    if ('strict' in patch) next.dojezd_prisnost = patch.strict;
    for (const key of Object.keys(next)) if (key.startsWith('dojezd_') && (next[key] === '' || next[key] == null)) delete next[key];
    return next;
  });

  return (
    <CommuteControl
      stopId={answers.dojezd_zastavka || ''}
      limit={Number.isInteger(answers.dojezd_limit) ? answers.dojezd_limit : null}
      strict={answers.dojezd_prisnost || ''}
      onChange={onChange}
      strictOptions={strictQuestion?.options || []}
      strictLabel={strictQuestion?.label}
      track={track}
    />
  );
}

export default CommuteQuestion;
