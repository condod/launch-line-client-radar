import type { AppSettings } from '../types';

type SettingsPanelProps = {
  settings: AppSettings;
  prospectCount: number;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onResetDemoData: () => void;
};

const launchChecklist = [
  'Set business contact information before exporting proposals.',
  'Run Places collection only with the official API key.',
  'Audit owned websites before making claims in outreach.',
  'Export a JSON backup at the end of each work session.',
  'Human-review every call; AI outbound also requires written consent for the exact number.',
  'Avoid guarantees about rankings, review outcomes, or revenue.'
];

export function SettingsPanel({ settings, prospectCount, onUpdateSettings, onResetDemoData }: SettingsPanelProps) {
  return (
    <div className="page-stack">
      <section className="page-header">
        <p className="eyebrow">Settings</p>
        <h2>Configure the product for daily use or client delivery</h2>
        <p>These settings stay local in this browser and are included in JSON backups.</p>
      </section>
      <section className="panel">
        <div className="form-grid">
          <label>
            Business name
            <input value={settings.businessName} onChange={(event) => onUpdateSettings({ businessName: event.target.value })} />
          </label>
          <label>
            App title
            <input value={settings.appName} onChange={(event) => onUpdateSettings({ appName: event.target.value })} />
          </label>
          <label>
            Owner name
            <input value={settings.ownerName} onChange={(event) => onUpdateSettings({ ownerName: event.target.value })} />
          </label>
          <label>
            Owner email
            <input type="email" value={settings.ownerEmail} onChange={(event) => onUpdateSettings({ ownerEmail: event.target.value })} />
          </label>
          <label>
            Owner phone
            <input value={settings.ownerPhone} onChange={(event) => onUpdateSettings({ ownerPhone: event.target.value })} />
          </label>
          <label>
            Default city
            <input value={settings.defaultCity} onChange={(event) => onUpdateSettings({ defaultCity: event.target.value })} />
          </label>
          <label>
            Radius miles
            <input min="1" type="number" value={settings.defaultRadiusMiles} onChange={(event) => onUpdateSettings({ defaultRadiusMiles: Number(event.target.value) || 1 })} />
          </label>
          <label>
            Proposal deposit %
            <input
              max="100"
              min="0"
              type="number"
              value={settings.defaultProposalDepositPercent}
              onChange={(event) => onUpdateSettings({ defaultProposalDepositPercent: Number(event.target.value) || 0 })}
            />
          </label>
          <label>
            Optional care plan floor
            <input
              min="0"
              type="number"
              value={settings.monthlyReportingRetainer}
              onChange={(event) => onUpdateSettings({ monthlyReportingRetainer: Number(event.target.value) || 0 })}
            />
          </label>
          <label className="span-two">
            Proposal/compliance footer
            <textarea value={settings.complianceFooter} onChange={(event) => onUpdateSettings({ complianceFooter: event.target.value })} />
          </label>
        </div>
      </section>
      <section className="panel launch-panel">
        <div className="section-heading">
          <p className="eyebrow">Launch Checklist</p>
          <h2>Ready-to-run operating rules</h2>
        </div>
        <div className="checklist-grid">
          {launchChecklist.map((item) => (
            <div className="launch-check" key={item}>
              <span aria-hidden="true">OK</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="panel danger-zone">
        <div>
          <p className="eyebrow">Local data</p>
          <h2>{prospectCount} leads stored locally</h2>
          <p>Reset only after exporting a JSON backup if you need to keep current work.</p>
        </div>
        <button className="danger-action" onClick={onResetDemoData} type="button">Reset demo data</button>
      </section>
    </div>
  );
}
