export function WorkflowDiagram() {
  const steps = ['Find weak presence', 'Score opportunity', 'Recommend package', 'Capture notes', 'Follow up'];

  return (
    <section className="workflow-diagram" aria-label="Sales workflow">
      {steps.map((step, index) => (
        <div className="workflow-step" key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </section>
  );
}
