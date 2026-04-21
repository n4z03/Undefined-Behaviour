// code written by Rupneet (ID: 261096653)

export default function SignupRulesPanel() {
  return (
    <div className="signup-rules-panel" aria-labelledby="signup-rules-heading">
      <h3 id="signup-rules-heading" className="signup-rules-panel__title">Who can use McBook?</h3>
      <p className="signup-rules-panel__text">
        @mcgill.ca users can sign up as an Admin and can create and manage booking slots.
      </p>
      <p className="signup-rules-panel__text">
        @mail.mcgill.ca and @mcgill.ca users can reserve active slots.
      </p>
    </div>
  )
}
