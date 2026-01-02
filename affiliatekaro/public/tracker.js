(function () {
  try {
    var params = new URLSearchParams(window.location.search || "");
    var ref = params.get("ref") || params.get("via");
    if (!ref) return;

    function getVisitorId() {
      try {
        var key = "ak_vid";
        var existing = window.localStorage.getItem(key);
        if (existing) return existing;
        var id =
          (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
          String(Math.random()).slice(2) + String(Date.now());
        window.localStorage.setItem(key, id);
        return id;
      } catch {
        return undefined;
      }
    }

    function setCookie(name, value, days) {
      var ms = (days || 30) * 864e5;
      var expires = new Date(Date.now() + ms).toUTCString();
      document.cookie =
        name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/; SameSite=Lax";
    }

    var payload = {
      ref: String(ref || ""),
      url: window.location.href,
      visitorId: getVisitorId(),
    };

    fetch((window.__AFFILIATEKARO_BASE_URL || "https://" + window.location.host) + "/api/track/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "cors",
      keepalive: true,
    })
      .then(function (r) {
        return r.json().catch(function () {
          return null;
        });
      })
      .then(function (data) {
        if (!data || !data.affiliateId || !data.programId) return;
        var ts = String(Date.now());
        // Cookie must store affiliate_id, program_id, timestamp
        setCookie("ak_attrib", data.affiliateId + "." + data.programId + "." + ts, data.cookieDays);
      })
      .catch(function () {});
  } catch {}
})();

