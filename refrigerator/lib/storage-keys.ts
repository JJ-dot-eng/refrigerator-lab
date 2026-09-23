// Browser storage keys shared by the wizard and the editor (drafts are per-browser conveniences only).
export const WIZARD_KEY='refrigerator-wizard-spec';
export const WIZARD_BASE='wizard';
export const draftKey=(base:string)=>`refrigerator-editor:${base}`;
