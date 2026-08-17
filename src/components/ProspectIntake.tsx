import { useState } from 'react';
import type { FormEvent } from 'react';
import { categoryProfiles, defaultMarkets } from '../data/categories';
import { createBlankProspectInput, createManualProspect } from '../lib/prospectFactory';
import type { ManualProspectInput, ProspectRecord } from '../types';

type ProspectIntakeProps = {
  onCreate: (lead: ProspectRecord) => void;
};

export function ProspectIntake({ onCreate }: ProspectIntakeProps) {
  const [form, setForm] = useState<ManualProspectInput>(() => createBlankProspectInput());
  const [open, setOpen] = useState(false);

  function setField(key: keyof ManualProspectInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lead = createManualProspect(form);
    onCreate(lead);
    setForm(createBlankProspectInput());
    setOpen(false);
  }

  return (
    <section className="panel">
      <div className="split-header">
        <div className="section-heading">
          <p className="eyebrow">Lead Intake</p>
          <h2>Add a lead manually</h2>
          <p>Use this for referrals, Chamber lists, networking leads, or researched businesses you do not collect through Places.</p>
        </div>
        <button className="primary-action" onClick={() => setOpen((value) => !value)} type="button">
          {open ? 'Close form' : 'Add lead'}
        </button>
      </div>
      {open ? (
        <form className="manual-lead-form" onSubmit={submitLead}>
          <div className="form-grid">
            <label>
              Business name
              <input required value={form.businessName} onChange={(event) => setField('businessName', event.target.value)} />
            </label>
            <label>
              Category
              <select value={form.category} onChange={(event) => setField('category', event.target.value)}>
                {categoryProfiles.map((profile) => <option key={profile.category}>{profile.category}</option>)}
              </select>
            </label>
            <label>
              City
              <select value={form.city} onChange={(event) => setField('city', event.target.value)}>
                {defaultMarkets.map((city) => <option key={city}>{city}</option>)}
              </select>
            </label>
            <label>
              State
              <input value={form.state} onChange={(event) => setField('state', event.target.value)} />
            </label>
            <label className="span-two">
              Address
              <input value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Street, city, state" />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="Optional" />
            </label>
            <label>
              Website
              <input value={form.website} onChange={(event) => setField('website', event.target.value)} placeholder="https://..." />
            </label>
            <label>
              Rating
              <input max="5" min="0" step="0.1" type="number" value={form.rating} onChange={(event) => setField('rating', event.target.value)} />
            </label>
            <label>
              Reviews
              <input min="0" step="1" type="number" value={form.reviews} onChange={(event) => setField('reviews', event.target.value)} />
            </label>
            <label className="span-two">
              Notes
              <textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Why this lead matters, where it came from, or what to check next." />
            </label>
          </div>
          <div className="action-row">
            <button className="primary-action" type="submit">Save and score lead</button>
            <button className="secondary-action" onClick={() => setForm(createBlankProspectInput())} type="button">Clear form</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
