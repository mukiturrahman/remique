const fs = require('fs');
let code = fs.readFileSync('src/components/analytics.tsx', 'utf8');

const newScripts = `      {/* Microsoft Clarity */}
      {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID && (
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: \`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "\${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");
            \`,
          }}
        />
      )}

      {/* Google Analytics */}
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-TJPSESCNXC"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: \`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-TJPSESCNXC');
          \`,
        }}
      />`;

code = code.replace(`      {/* Microsoft Clarity */}
      {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID && (
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: \`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "\${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");
            \`,
          }}
        />
      )}`, newScripts);

fs.writeFileSync('src/components/analytics.tsx', code);
console.log('Patched GA');
