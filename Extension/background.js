// Demo Buddy — Background Service Worker (Manifest V3)

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(['demoMaskerSettings'], (result) => {
    if (!result.demoMaskerSettings) {
      browser.storage.local.set({
        demoMaskerSettings: {
          enabled: false,
          companyOriginal: '',
          companyReplacement: '',
          emailDomainOriginal: '',
          emailDomainReplacement: '',
          serialMode: 'scramble',
          blurList: ''
        }
      });
    }
  });
});
