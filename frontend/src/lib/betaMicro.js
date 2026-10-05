export function nextBetaMicro(questions,state,checklist,session) {
  const pending=questions.find(q=>state[q.id]?.session_id===session && state[q.id].done===false);
  if (pending) return {question:pending,resume:true};
  if (Object.values(state).some(s=>s.session_id===session)) return null;
  const question=questions.find(q=>checklist[q.check] && (!state[q.id] || state[q.id].done===false));
  return question?{question,resume:false}:null;
}
