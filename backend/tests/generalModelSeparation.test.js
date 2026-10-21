const {
  CambridgeListening,
  CambridgeReading,
  CambridgeSubmission,
  GeneralListening,
  GeneralReading,
  GeneralSubmission,
} = require('../models');
const { getCambridgeModelByType } = require('../modules/cambridge/shared/submissionUtils');

describe('General persistence separation', () => {
  test('uses dedicated tables for General tests and submissions', () => {
    expect(GeneralReading).not.toBe(CambridgeReading);
    expect(GeneralListening).not.toBe(CambridgeListening);
    expect(GeneralSubmission).not.toBe(CambridgeSubmission);

    expect(GeneralReading.getTableName()).toBe('general_reading_tests');
    expect(GeneralListening.getTableName()).toBe('general_listening_tests');
    expect(GeneralSubmission.getTableName()).toBe('general_submissions');
  });

  test('routes General test lookups to General models without changing Orange lookups', () => {
    expect(getCambridgeModelByType('general-reading-60', 'general')).toBe(GeneralReading);
    expect(getCambridgeModelByType('general-listening', 'general')).toBe(GeneralListening);
    expect(getCambridgeModelByType('ket-reading', 'orange')).toBe(CambridgeReading);
    expect(getCambridgeModelByType('ket-listening', 'orange')).toBe(CambridgeListening);
  });
});
