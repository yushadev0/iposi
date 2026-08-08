object UniServerModule: TUniServerModule
  AutoCoInitialize = True
  TempFolder = 'temp\'
  Title = 'Iposi - An API Tester'
  AjaxTimeout = 9999999
  SuppressErrors = []
  Bindings = <>
  CustomFiles.Strings = (
    'files/style.css'
    'files/script.js'
    
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/al' +
      'l.min.css'
    
      'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemi' +
      'rror.min.css'
    
      'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/' +
      'monokai.min.css'
    
      'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemi' +
      'rror.min.js'
    
      'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/j' +
      'avascript/javascript.min.js')
  CustomCSS.Strings = (
    ''
    
      '  html, body, .x-body, .x-viewport, .x-panel, .x-panel-body, .x-' +
      'window-body {'
    '       background-color: #121213 !important;'
    '       background: #121213 !important;'
    '       border: none !important;'
    '       box-shadow: none !important;'
    '       margin: 0 !important;'
    '       padding: 0 !important;'
    '   }'
    '   '
    '   .x-window, '
    '   .x-window-default, '
    '   .x-window-maximized,'
    '   .x-layer,'
    '   .x-window-body {'
    '       border: none !important;'
    '       box-shadow: none !important;'
    '       outline: none !important;'
    
      '       background-color: #121213 !important; /* Arka plan'#305' da ka' +
      'ranl'#305'k yap'#305'yoruz ki s'#305'r'#305'tmaya '#231'al'#305#351'mas'#305'n */'
    '       background-image: none !important;'
    '   }'
    '')
  SSL.SSLOptions.RootCertFile = 'root.pem'
  SSL.SSLOptions.CertFile = 'cert.pem'
  SSL.SSLOptions.KeyFile = 'key.pem'
  SSL.SSLOptions.Method = sslvSSLv23
  SSL.SSLOptions.SSLVersions = [sslvTLSv1_1, sslvTLSv1_2]
  SSL.SSLOptions.Mode = sslmUnassigned
  SSL.SSLOptions.VerifyMode = []
  SSL.SSLOptions.VerifyDepth = 0
  ConnectionFailureRecovery.ErrorMessage = 'Connection Error'
  ConnectionFailureRecovery.RetryMessage = 'Retrying...'
  Height = 750
  Width = 1000
  PixelsPerInch = 120
end
