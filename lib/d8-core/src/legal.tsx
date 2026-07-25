import type { ReactNode } from 'react';

export const LEGAL_EFFECTIVE_DATE = '25 July 2026';
export const PRIVACY_EMAIL = 'lusamalungisha@gmail.com';

type LegalPageProps = {
  homeHref?: string;
};

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

function Brand() {
  return (
    <span className="inline-flex items-baseline" aria-label="D8Advisr">
      <span className="font-black tracking-tight text-primary">D8</span>
      <span className="font-black tracking-tight text-foreground">Advisr</span>
    </span>
  );
}

function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-bold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function LegalList({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-2">{children}</ul>;
}

function LegalPage({
  title,
  summary,
  homeHref,
  children,
}: LegalPageProps & {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href={homeHref} className="text-2xl" aria-label="Back to D8Advisr home">
            <Brand />
          </a>
          <nav className="flex items-center gap-4 text-sm font-semibold" aria-label="Legal pages">
            <a className="text-muted-foreground transition-colors hover:text-primary" href="/privacy">
              Privacy
            </a>
            <a className="text-muted-foreground transition-colors hover:text-primary" href="/terms">
              Terms
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">Legal</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">{summary}</p>
          <p className="mt-5 text-sm font-medium text-muted-foreground">
            Effective date: {LEGAL_EFFECTIVE_DATE}
          </p>
        </div>

        <article className="space-y-10 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
          {children}
        </article>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} D8Advisr</span>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}

export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav className={`flex items-center justify-center gap-4 text-sm ${className}`.trim()} aria-label="Legal">
      <a className="font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline" href="/privacy">
        Privacy Policy
      </a>
      <a className="font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline" href="/terms">
        Terms of Service
      </a>
    </nav>
  );
}

export function AccountLegalNotice() {
  return (
    <p className="text-center text-xs leading-5 text-muted-foreground">
      By creating an account, you agree to our{' '}
      <a className="font-semibold text-foreground underline underline-offset-2 hover:text-primary" href="/terms">
        Terms of Service
      </a>{' '}
      and acknowledge our{' '}
      <a className="font-semibold text-foreground underline underline-offset-2 hover:text-primary" href="/privacy">
        Privacy Policy
      </a>
      .
    </p>
  );
}

export function PrivacyPolicyPage({ homeHref = '/' }: LegalPageProps) {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This policy explains what information D8Advisr collects, why we use it, when we share it, and the choices available to you."
      homeHref={homeHref}
    >
      <LegalSection title="1. Who this policy covers">
        <p>
          This Privacy Policy applies to the D8Advisr consumer planning service, the D8Advisr Partner
          portal, and related websites and services (together, the “Service”). In this policy,
          “D8Advisr”, “we”, “us”, and “our” refer to the operator of the Service.
        </p>
        <p>
          If you have a privacy question or want to exercise a privacy right, contact us at{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>We collect information in the following categories:</p>
        <LegalList>
          <li>
            <strong className="text-foreground">Account and identity information.</strong> Your email
            address, display name, account identifier, password credentials in protected form, profile
            image, and authentication status.
          </li>
          <li>
            <strong className="text-foreground">Google Sign-In information.</strong> If you choose
            Google Sign-In, we receive the basic account information you approve through Google:
            your name, email address, profile image, and Google account identifier. We do not receive
            your Google password or request access to Gmail, Google Drive, Google Calendar, or your
            contacts.
          </li>
          <li>
            <strong className="text-foreground">Profile and preference information.</strong> Your
            selected city or region, date and group-experience preferences, vibe preferences, budget
            ranges, saved plans, profile settings, and notification preferences.
          </li>
          <li>
            <strong className="text-foreground">Plans and community content.</strong> Plans, plan
            stops, group invitations and collaborators, reviews, ratings, notes, tags, saved items,
            and information you submit about venues or events.
          </li>
          <li>
            <strong className="text-foreground">Partner information.</strong> Business and contact
            details, venue and event listing information, application status, uploaded images or
            media, and content submitted through partner tools.
          </li>
          <li>
            <strong className="text-foreground">Technical information.</strong> Internet Protocol
            address, browser and device type, authentication and security events, diagnostic logs,
            and interactions with the Service that may be generated by us or our infrastructure
            providers.
          </li>
          <li>
            <strong className="text-foreground">Browser storage.</strong> Session tokens and settings
            stored locally in your browser, such as theme, preferences, and notification choices.
            D8Advisr does not currently use this information for targeted advertising.
          </li>
        </LegalList>
        <p>
          D8Advisr currently uses your selected city or region to show relevant places and experiences
          and does not request your device’s precise location. Some payment-related settings in the
          current product are display-only preferences stored in your browser. We do not currently
          collect or process full payment-card or bank-account credentials.
        </p>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <p>We use information to:</p>
        <LegalList>
          <li>create and secure accounts, authenticate users, and route each account to the correct service;</li>
          <li>personalise recommendations and generate, save, and coordinate plans;</li>
          <li>enable group collaboration, reviews, partner applications, listings, and content management;</li>
          <li>send service, account, application, and security notifications;</li>
          <li>operate maps and location-based discovery using the city or region you select;</li>
          <li>maintain, troubleshoot, protect, and improve the Service; and</li>
          <li>comply with law, enforce our terms, and prevent fraud, abuse, or security incidents.</li>
        </LegalList>
        <p>
          We may combine or aggregate information so it no longer reasonably identifies an individual,
          and use that information for product analysis and planning.
        </p>
      </LegalSection>

      <LegalSection title="4. Our legal bases">
        <p>
          Where applicable law requires a legal basis, we process personal information because it is
          necessary to provide the Service or take steps you request, because you have given consent,
          because we have a legitimate interest in operating and securing the Service that is not
          overridden by your rights, or because we must comply with a legal obligation.
        </p>
        <p>
          These bases reflect the principles in Zambia’s Data Protection Act No. 3 of 2021, Nigeria’s
          Data Protection Act 2023, and other privacy laws that may apply to you.
        </p>
      </LegalSection>

      <LegalSection title="5. When we share information">
        <p>We may share information in these limited circumstances:</p>
        <LegalList>
          <li>
            <strong className="text-foreground">Service providers.</strong> With providers that support
            hosting, database, authentication, storage, email delivery, mapping, content delivery,
            security, and technical operations. These currently include Supabase and Vercel, as well
            as Google when you use Google Sign-In.
          </li>
          <li>
            <strong className="text-foreground">Other users.</strong> With people you invite to a group
            plan or collaborate with, to the extent needed for that feature.
          </li>
          <li>
            <strong className="text-foreground">Partners and the public.</strong> Reviews may contribute
            to partner insights, and approved venue or event submissions and partner listings may be
            visible to Service users. We limit partner-facing review information where practical.
          </li>
          <li>
            <strong className="text-foreground">Legal and safety reasons.</strong> When reasonably
            necessary to comply with law or legal process, protect rights and safety, investigate
            misuse, or defend legal claims.
          </li>
          <li>
            <strong className="text-foreground">Business changes.</strong> As part of a proposed or
            completed financing, merger, acquisition, reorganisation, or transfer of the Service,
            subject to appropriate confidentiality and legal safeguards.
          </li>
        </LegalList>
        <p>We do not sell personal information or Google user data.</p>
      </LegalSection>

      <LegalSection title="6. Google user data">
        <p>
          D8Advisr uses Google account data only to authenticate you, create or connect your D8Advisr
          account, display your chosen account name and profile image, and protect account security.
          We do not use Google user data for advertising, sell it, or allow humans to read it except
          with your affirmative permission, where necessary for security or support, or where required
          by law.
        </p>
        <p>
          Our use and transfer of information received from Google APIs follows the{' '}
          <a
            className="font-semibold text-primary hover:underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            rel="noreferrer"
            target="_blank"
          >
            Google API Services User Data Policy
          </a>
          , including its Limited Use requirements.
        </p>
        <p>
          You can revoke D8Advisr’s Google access from your Google Account permissions. Revoking access
          stops future Google sign-in access but does not automatically delete your D8Advisr account or
          information already stored in it. Email us to request account deletion.
        </p>
      </LegalSection>

      <LegalSection title="7. International processing">
        <p>
          D8Advisr and its providers may process information in countries other than the one where you
          live. Those countries may have different data-protection laws. Where required, we use
          contractual, organisational, and technical safeguards for cross-border transfers.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention and security">
        <p>
          We retain personal information while your account is active and for as long as reasonably
          needed to provide the Service, resolve disputes, maintain security, enforce agreements, and
          meet legal obligations. Retention may vary by data type. Deleted information may remain for
          a limited period in protected backups or where law requires retention.
        </p>
        <p>
          We use reasonable administrative, technical, and organisational safeguards designed to
          protect information. No internet service can guarantee absolute security, so please use a
          strong, unique password and notify us if you suspect unauthorised access.
        </p>
      </LegalSection>

      <LegalSection title="9. Your choices and rights">
        <p>
          Depending on where you live, you may have rights to be informed, access or receive a copy of
          your information, correct it, request deletion, restrict or object to processing, withdraw
          consent, request portability, and complain to a data-protection authority. You may also
          update certain profile and preference information in the Service.
        </p>
        <p>
          To make a request, email{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          . We may need to verify your identity and may retain information where an exception under
          applicable law applies. You may complain to the Zambia Data Protection Commission, the
          Nigeria Data Protection Commission, or another authority with jurisdiction over your
          information.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          The Service is intended for adults and is not directed to anyone under 18. We do not
          knowingly collect personal information from children. If you believe a child has provided
          information to us, contact us so we can investigate and take appropriate action.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this policy">
        <p>
          We may update this policy as the Service, our providers, or legal requirements change. We
          will publish the updated version here, revise the effective date, and provide additional
          notice when required by law or when a change is material.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Privacy questions and requests can be sent to{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          . Please include enough detail for us to understand and respond to your request.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

export function TermsOfServicePage({ homeHref = '/' }: LegalPageProps) {
  return (
    <LegalPage
      title="Terms of Service"
      summary="These terms govern your access to D8Advisr’s consumer planning service and partner portal."
      homeHref={homeHref}
    >
      <LegalSection title="1. Accepting these terms">
        <p>
          By creating an account, accessing, or using D8Advisr, you agree to these Terms of Service and
          our Privacy Policy. If you use the Service for a business or organisation, you confirm that
          you have authority to bind it to these terms.
        </p>
        <p>
          You must be at least 18 years old and legally able to enter into these terms. Do not use the
          Service if applicable law prohibits you from doing so.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts and access">
        <p>
          You must provide accurate account information, keep your login details secure, and promptly
          notify us of suspected unauthorised access. You are responsible for activity under your
          account unless applicable law provides otherwise.
        </p>
        <p>
          Consumer, partner, and administrator access have different permissions. You may not bypass
          access controls, impersonate another person or business, or use an account outside the scope
          assigned to it.
        </p>
      </LegalSection>

      <LegalSection title="3. What D8Advisr provides">
        <p>
          D8Advisr helps users discover venues and events, create and coordinate date or group plans,
          save ideas, set planning preferences, and share reviews. The Partner portal lets approved
          businesses apply for access and manage eligible venue, event, and promotional content.
        </p>
        <p>
          Recommendations, availability, prices, opening hours, travel times, event details, and
          third-party information may change or be incomplete. Confirm important details directly
          with the relevant venue, organiser, or provider before relying on them.
        </p>
      </LegalSection>

      <LegalSection title="4. Budgets and payment-related features">
        <p>
          Budget, stash, and cost-estimate features are planning tools only. D8Advisr is not a bank,
          payment processor, financial adviser, booking agent, or escrow service. Current
          payment-related account settings are display-only and do not create a bank or card account
          relationship with D8Advisr.
        </p>
      </LegalSection>

      <LegalSection title="5. Your content">
        <p>
          You retain ownership of content you submit, including reviews, plans, listing details, and
          media. You grant D8Advisr a worldwide, non-exclusive, royalty-free licence to host, store,
          reproduce, format, display, and distribute that content only as reasonably needed to operate,
          secure, improve, and promote the Service and the listing or experience to which it relates.
          This licence lasts while the content is on the Service and for a reasonable backup period.
        </p>
        <p>
          You confirm that you have the rights and permissions needed to submit your content and that
          it is accurate, lawful, and does not violate another person’s privacy, intellectual-property,
          or other rights. We may remove or restrict content that violates these terms or creates risk
          for users, partners, or D8Advisr.
        </p>
      </LegalSection>

      <LegalSection title="6. Partner responsibilities">
        <p>
          Partners must provide accurate business, venue, event, price, availability, and contact
          information; keep listings current; honour representations they make to users; and comply
          with licensing, consumer-protection, advertising, tax, safety, and other laws applicable to
          their activities.
        </p>
        <p>
          Partner approval or listing on D8Advisr is not an endorsement, certification, employment,
          agency, franchise, or joint venture. Partners remain independently responsible for their
          services, premises, staff, offers, and interactions with users.
        </p>
      </LegalSection>

      <LegalSection title="7. Acceptable use">
        <p>You may not use the Service to:</p>
        <LegalList>
          <li>break the law, facilitate harm, harassment, discrimination, fraud, or deception;</li>
          <li>submit unlawful, misleading, infringing, malicious, or sexually exploitative content;</li>
          <li>scrape, probe, reverse engineer, overload, disrupt, or attempt unauthorised access to the Service;</li>
          <li>circumvent security, moderation, rate limits, or account permissions;</li>
          <li>introduce malware or use automated systems without our written permission; or</li>
          <li>misuse personal information obtained through plans, invitations, reviews, or partner tools.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. Third-party services and places">
        <p>
          The Service may use or link to third-party services, including authentication, hosting,
          mapping, venue, event, and website providers. Their own terms and privacy policies govern
          your use of those services. D8Advisr does not control third-party services or the safety,
          quality, legality, accessibility, or availability of third-party venues and events.
        </p>
        <p>
          Use reasonable judgement when travelling, meeting others, attending events, or visiting a
          venue. In an emergency, contact the appropriate local emergency service.
        </p>
      </LegalSection>

      <LegalSection title="9. D8Advisr intellectual property">
        <p>
          The Service, brand, interface, software, and D8Advisr-created content are owned by or licensed
          to D8Advisr and protected by applicable law. Subject to these terms, we give you a limited,
          revocable, non-transferable right to use the Service for its intended purpose. No other
          licence is granted.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes, suspension, and termination">
        <p>
          We may change, suspend, or discontinue features and may restrict or terminate access where
          reasonably necessary to protect the Service or others, address a legal or security risk, or
          respond to a material breach of these terms. Where practical and lawful, we will provide
          notice.
        </p>
        <p>
          You may stop using the Service at any time. To request deletion of your account, email{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          . Provisions that by their nature should continue after termination will survive.
        </p>
      </LegalSection>

      <LegalSection title="11. Disclaimers">
        <p>
          To the extent permitted by law, the Service is provided “as is” and “as available”. We do not
          promise that the Service will always be uninterrupted, error-free, or that every
          recommendation or third-party listing will be accurate or suitable for you. Nothing in these
          terms excludes warranties or consumer rights that cannot lawfully be excluded.
        </p>
      </LegalSection>

      <LegalSection title="12. Liability">
        <p>
          To the fullest extent permitted by applicable law, D8Advisr is not liable for indirect,
          incidental, special, consequential, or punitive loss, or for loss arising from third-party
          venues, events, content, services, or conduct. D8Advisr remains responsible where liability
          cannot lawfully be limited or excluded, including any mandatory consumer protections.
        </p>
      </LegalSection>

      <LegalSection title="13. Disputes and applicable law">
        <p>
          Before starting formal proceedings, please contact us and allow a reasonable opportunity to
          resolve the issue informally. Applicable law and the courts with lawful jurisdiction will
          govern any unresolved dispute. Nothing in these terms prevents you from using a
          consumer-protection process or court available to you under mandatory local law.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes to these terms">
        <p>
          We may update these terms to reflect changes to the Service, law, or our operations. We will
          publish the updated terms here, revise the effective date, and provide additional notice
          where required. Continuing to use the Service after an update takes effect means you accept
          the updated terms, to the extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          Questions about these terms can be sent to{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
