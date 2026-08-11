unit Main;

interface

uses
  Windows, Messages, SysUtils, Variants, Classes, Graphics,
  Controls, Forms, uniGUITypes, uniGUIAbstractClasses,
  uniGUIClasses, uniGUIRegClasses, uniGUIForm, uniGUIBaseClasses, uniButton,
  uniBitBtn, uniPanel, uniHTMLFrame, IdHTTP, IdSSLOpenSSL, System.NetEncoding,
  System.Diagnostics, System.Net.HttpClient, System.Net.URLClient,
  System.Net.HttpClientComponent, System.JSON;

type
  TMainForm = class(TUniForm)
    MainHTML: TUniHTMLFrame;
    procedure UniFormCreate(Sender: TObject);
    procedure MainHTMLAjaxEvent(Sender: TComponent; EventName: string;
      Params: TUniStrings);
    procedure UniFormAfterShow(Sender: TObject);
  private
    { Private declarations }
    procedure LoadHistoryList;
  public
    { Public declarations }

  end;

function MainForm: TMainForm;

implementation

{$R *.dfm}

uses
  uniGUIVars, MainModule, uniGUIApplication, ServerModule;

function MainForm: TMainForm;
begin
  Result := TMainForm(UniMainModule.GetFormInstance(TMainForm));
end;

procedure TMainForm.MainHTMLAjaxEvent(Sender: TComponent; EventName: string;
  Params: TUniStrings);
var
  LMethod, LUrl, LTabName, LBodyStr, LHeadersStr: string;
  LBodyType, LRawType, LParamsStr, LUrlencodedStr, LSaveHistory: string;
  HttpClient: TNetHTTPClient;
  ReqBody: TStringStream;
  ResObj: IHTTPResponse;
  Stopwatch: TStopwatch;
  ResTime, ResSize: string;
  ResCode, I: Integer;
  ResText, SafeResBody, RawResBody: string;
  HeadersArray: TJSONArray;
  HeaderObj: TJSONObject;
  K, V: string;
begin
  if EventName = 'ExecuteAPI' then
  begin
    // 1. JS'DEN GELEN PARAMETRELERİ YAKALAMA
    LMethod := Params.Values['method'];
    LUrl := TNetEncoding.URL.Decode(Params.Values['url']);
    LTabName := TNetEncoding.URL.Decode(Params.Values['tab_name']);
    LBodyStr := TNetEncoding.URL.Decode(Params.Values['body']);
    LHeadersStr := TNetEncoding.URL.Decode(Params.Values['headers']);
    LBodyType := Params.Values['body_type'];
    LRawType := Params.Values['raw_type'];
    LParamsStr := TNetEncoding.URL.Decode(Params.Values['params']);
    LUrlencodedStr := TNetEncoding.URL.Decode(Params.Values['urlencoded']);
    LSaveHistory := Params.Values['save_history'];

    // 2. HTTP İSTEĞİNİ ATMA (Önce isteği atıp sonucu alıyoruz)
    HttpClient := TNetHTTPClient.Create(nil);
    ReqBody := TStringStream.Create(LBodyStr, TEncoding.UTF8);
    try
      HttpClient.SecureProtocols := [THTTPSecureProtocol.TLS12,
        THTTPSecureProtocol.TLS13];
      HttpClient.ConnectionTimeout := 15000;
      HttpClient.ResponseTimeout := 15000;

      HttpClient.ContentType := 'application/json';
      HttpClient.Accept := 'application/json';

      // Özel Header'ları Ekleme...
      if (LHeadersStr <> '') and (LHeadersStr <> '[]') then
      begin
        HeadersArray := TJSONObject.ParseJSONValue(LHeadersStr) as TJSONArray;
        if Assigned(HeadersArray) then
        begin
          try
            for I := 0 to HeadersArray.Count - 1 do
            begin
              HeaderObj := HeadersArray.Items[I] as TJSONObject;
              if Assigned(HeaderObj) then
              begin
                K := HeaderObj.GetValue('key').Value;
                V := HeaderObj.GetValue('value').Value;
                HttpClient.CustomHeaders[K] := V;
              end;
            end;
          finally
            HeadersArray.Free;
          end;
        end;
      end;

      Stopwatch := TStopwatch.StartNew;
      ResCode := 0;
      ResText := '';
      RawResBody := '';

      try
        if LMethod = 'GET' then
          ResObj := HttpClient.Get(LUrl)
        else if LMethod = 'POST' then
          ResObj := HttpClient.Post(LUrl, ReqBody)
        else if LMethod = 'PUT' then
          ResObj := HttpClient.Put(LUrl, ReqBody)
        else if LMethod = 'DELETE' then
          ResObj := HttpClient.Delete(LUrl)
        else if LMethod = 'PATCH' then
          ResObj := HttpClient.Patch(LUrl, ReqBody);

        if Assigned(ResObj) then
        begin
          ResCode := ResObj.StatusCode;
          ResText := ResObj.StatusText;
          RawResBody := ResObj.ContentAsString(TEncoding.UTF8);
        end;
      except
        on E: Exception do
        begin
          ResCode := 0;
          // Bağlantı koptuysa veya Timeout olduysa 0 olarak kalacak
          ResText := 'ERROR';
          RawResBody := '{ "error": "' + E.Message + '" }';
        end;
      end;

      // ==========================================
      // 3. VERİTABANINA HISTORY KAYDI (Sonuçlandıktan Sonra INSERT)
      // ==========================================
      if LSaveHistory = '1' then
      begin

        try
          with UniMainModule.ApiHistoryTable do
          begin
            Close;
            // SQL Sorgusuna status_code eklendi
            SQL.Text :=
              'INSERT INTO api_history (user_id, tab_name, method, url, body_type, raw_type, req_body, req_params, req_headers, req_urlencoded, status_code) '
              + 'VALUES (:uid, :tname, :method, :url, :btype, :rtype, :body, :params, :headers, :urlenc, :scode)';

            // Parametre Atamaları (ID için her ihtimale karşı .Value kullanmak daha garantidir)
            ParamByName('uid').Value := UniMainModule.LoggedUserId;
            ParamByName('tname').AsString := LTabName;
            ParamByName('method').AsString := LMethod;
            ParamByName('url').AsString := LUrl;
            ParamByName('btype').AsString := LBodyType;
            ParamByName('rtype').AsString := LRawType;
            ParamByName('body').AsString := LBodyStr;
            ParamByName('params').AsString := LParamsStr;
            ParamByName('headers').AsString := LHeadersStr;
            ParamByName('urlenc').AsString := LUrlencodedStr;

            // YENİ EKLENEN: Sunucudan dönen gerçek HTTP Status kodu
            ParamByName('scode').AsInteger := ResCode;

            ExecSQL;
          end;
        except
          // Geçmiş kaydında bir hata olursa API cevabının ekrana basılmasını engellemesin
        end;
      end;

      // ==========================================
      // 4. SONUÇLARI ARAYÜZE BASMA
      // ==========================================
      Stopwatch.Stop;
      ResTime := Stopwatch.ElapsedMilliseconds.ToString + ' ms';

      if Length(RawResBody) < 1024 then
        ResSize := Length(RawResBody).ToString + ' B'
      else
        ResSize := FormatFloat('0.00', Length(RawResBody) / 1024) + ' KB';

      SafeResBody := TNetEncoding.URL.Encode(RawResBody).Replace('+', '%20');

      UniSession.AddJS
        (Format('window.updateResponse("%d", "%s", "%s", "%s", decodeURIComponent("%s"));',
        [ResCode, ResText, ResTime, ResSize, SafeResBody]));

      LoadHistoryList;
    finally
      HttpClient.Free;
      ReqBody.Free;
    end;
  end;

  if EventName = 'AuthLogout' then
  begin
    var
      LCookie, LSelector: string;
    var
      LParts: TArray<string>;

    LCookie := UniApplication.Cookies.Values['iposi_remember'];
    if LCookie <> '' then
    begin
      LParts := LCookie.Split([':']);
      if Length(LParts) > 0 then
      begin
        LSelector := LParts[0];
        with UniMainModule.TokenTable do
        begin
          Close;
          SQL.Text := 'DELETE FROM user_tokens WHERE selector = :sel';
          ParamByName('sel').AsString := LSelector;
          Execute;
        end;
      end;
    end;

    UniApplication.Cookies.SetCookie('iposi_remember', '', Date - 1);
    UniApplication.Restart;
  end;

  // ==========================================
  // HISTORY SİLME İŞLEMİ (AJAX)
  // ==========================================
  if EventName = 'DeleteHistory' then
  begin
    var
      LDelId: Integer := StrToIntDef(Params.Values['id'], 0);

    if LDelId > 0 then
    begin
      try
        with UniMainModule.ApiHistoryTable do
        begin
          Close;
          SQL.Clear; // ÖNCEKİ SELECT PARAMETRELERİNİ TAMAMEN TEMİZLER
          SQL.Text :=
            'DELETE FROM api_history WHERE id = :id AND user_id = :uid';
          ParamByName('id').AsInteger := LDelId;
          ParamByName('uid').AsInteger := UniMainModule.LoggedUserId;
          ExecSQL;
        end;
      except
        // Eğer veritabanı tarafında bir hata olursa, JS popup'ımızı tetikle
        on E: Exception do
        begin
          // JS'deki tek tırnak çakışmalarını önlemek için mesajı temizleyelim
          var
            ErrorMsg: string := E.Message.Replace('"', '\"')
              .Replace('''', '\''');
          UniSession.AddJS
            ('window.iposiAlert("Delete Error", "Record could not be deleted from the database: '
            + ErrorMsg + '", "error");');
        end;
      end;
    end
    else
    begin
      // Eğer ID JavaScript'ten 0 veya boş geldiyse bizi uyar
      UniSession.AddJS
        ('window.iposiAlert("Connection Error", "Could not get the ID of the record to be deleted.", "error");');
    end;
  end;

  // ==========================================
  // HISTORY KAYDINI SEKME OLARAK AÇMA (AJAX)
  // ==========================================
  if EventName = 'LoadHistory' then
  begin
    var
      LHistId: Integer := StrToIntDef(Params.Values['id'], 0);

    if LHistId > 0 then
    begin
      try
        var
          HistObj: TJSONObject := TJSONObject.Create;
        try
          with UniMainModule.ApiHistoryTable do
          begin
            Close;
            SQL.Clear;
            SQL.Text :=
              'SELECT * FROM api_history WHERE id = :id AND user_id = :uid';
            ParamByName('id').Value := LHistId;
            ParamByName('uid').Value := UniMainModule.LoggedUserId;
            Open;

            if not EOF then
            begin
              HistObj.AddPair('tab_name', FieldByName('tab_name').AsString);
              HistObj.AddPair('method', FieldByName('method').AsString);
              HistObj.AddPair('url', FieldByName('url').AsString);
              HistObj.AddPair('body_type', FieldByName('body_type').AsString);
              HistObj.AddPair('raw_type', FieldByName('raw_type').AsString);
              HistObj.AddPair('req_body', FieldByName('req_body').AsString);
              HistObj.AddPair('req_params', FieldByName('req_params').AsString);
              HistObj.AddPair('req_headers', FieldByName('req_headers')
                .AsString);
              HistObj.AddPair('req_urlencoded', FieldByName('req_urlencoded')
                .AsString);

              // JSON'u güvenli bir şekilde JS'e aktarmak için URL Encode yapıyoruz
              var
                EncodedJson: string := TNetEncoding.URL.Encode(HistObj.ToJSON)
                  .Replace('+', '%20');

              UniSession.AddJS('window.loadHistoryIntoTab(decodeURIComponent('''
                + EncodedJson + '''));');
            end;
          end;
        finally
          HistObj.Free;
        end;
      except
        on E: Exception do
        begin
          var
            ErrorMsg: string := E.Message.Replace('"', '\"')
              .Replace('''', '\''');
          UniSession.AddJS
            ('window.iposiAlert("Data Error", "Record could not be retrieved from the database: '
            + ErrorMsg + '", "error");');
        end;
      end;
    end;
  end;

end;

procedure TMainForm.UniFormAfterShow(Sender: TObject);
begin
  UniMainModule.GirisTable.Open;
  UniSession.AddJS('window.setWorkspaceUser(''' +
    UniMainModule.LoggedUserName + ''')');
  LoadHistoryList;

end;

procedure TMainForm.UniFormCreate(Sender: TObject);
begin
  MainHTML.HTML.LoadFromFile(UniServerModule.FilesFolderPath +
    '/main_form.html', TEncoding.UTF8);
end;

procedure TMainForm.LoadHistoryList;
var
  JsonArray: TJSONArray;
  JsonObj: TJSONObject;
begin
  JsonArray := TJSONArray.Create;
  try
    with UniMainModule.ApiHistoryTable do
    begin
      Close;
      SQL.Text :=
        'SELECT id, method, status_code, tab_name, url FROM api_history WHERE user_id = :uid ORDER BY created_at DESC';
      ParamByName('uid').AsInteger := UniMainModule.LoggedUserId;
      Open;

      while not EOF do
      begin
        JsonObj := TJSONObject.Create;
        JsonObj.AddPair('id', TJSONNumber.Create(FieldByName('id').AsInteger));
        JsonObj.AddPair('method', FieldByName('method').AsString);
        JsonObj.AddPair('status_code',
          TJSONNumber.Create(FieldByName('status_code').AsInteger));
        JsonObj.AddPair('tab_name', FieldByName('tab_name').AsString);
        JsonObj.AddPair('url', FieldByName('url').AsString);

        JsonArray.AddElement(JsonObj);
        Next;
      end;
    end;

    UniSession.AddJS('window.fillHistory(''' + JsonArray.ToJSON + ''');');
  finally
    JsonArray.Free;
  end;
end;

initialization

RegisterAppFormClass(TMainForm);

end.
