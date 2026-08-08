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
  LMethod, LUrl, LBodyStr: string;
  HttpClient: TNetHTTPClient;
  ReqBody: TStringStream;
  ResObj: IHTTPResponse;
  Stopwatch: TStopwatch;
  ResTime, ResSize: string;
  ResCode: Integer;
  ResText, SafeResBody, RawResBody, LHeadersStr: string;
  HeadersArray: TJSONArray;
  HeaderObj: TJSONObject;
  K, V: string;
  I: Integer;
begin
  if EventName = 'ExecuteAPI' then
  begin
    LMethod := Params.Values['method'];
    LUrl := TNetEncoding.URL.Decode(Params.Values['url']);
    LBodyStr := TNetEncoding.URL.Decode(Params.Values['body']);

    // JS'den gelen Header JSON'unu yakala
    LHeadersStr := TNetEncoding.URL.Decode(Params.Values['headers']);

    HTTPClient := TNetHTTPClient.Create(nil);
    ReqBody := TStringStream.Create(LBodyStr, TEncoding.UTF8);
    try
      HTTPClient.SecureProtocols := [THTTPSecureProtocol.TLS12, THTTPSecureProtocol.TLS13];

      HTTPClient.ConnectionTimeout := 15000;
      HTTPClient.ResponseTimeout := 15000;

      // Varsayılan Başlıklar
      HTTPClient.ContentType := 'application/json';
      HTTPClient.Accept := 'application/json';

      // ==========================================
      // KULLANICININ GİRDİĞİ HEADER'LARI EKLEME
      // ==========================================
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

                // Gelen Key ve Value değerlerini doğrudan HTTP motoruna basıyoruz
                HTTPClient.CustomHeaders[K] := V;
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

      // ... İSTEĞİ ATMA KISMI AYNI (GET, POST, PUT vs) ...
      try
        if LMethod = 'GET' then
          ResObj := HTTPClient.Get(LUrl)
        else if LMethod = 'POST' then
          ResObj := HTTPClient.Post(LUrl, ReqBody)
        else if LMethod = 'PUT' then
          ResObj := HTTPClient.Put(LUrl, ReqBody)
        else if LMethod = 'DELETE' then
          ResObj := HTTPClient.Delete(LUrl)
        else if LMethod = 'PATCH' then
          ResObj := HTTPClient.Patch(LUrl, ReqBody);

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
          ResText := 'ERROR';
          RawResBody := '{ "error": "' + E.Message + '" }';
        end;
      end;

      Stopwatch.Stop;
      ResTime := Stopwatch.ElapsedMilliseconds.ToString + ' ms';

      if Length(RawResBody) < 1024 then
        ResSize := Length(RawResBody).ToString + ' B'
      else
        ResSize := FormatFloat('0.00', Length(RawResBody) / 1024) + ' KB';

      SafeResBody := TNetEncoding.URL.Encode(RawResBody).Replace('+', '%20');

      UniSession.AddJS(Format(
        'window.updateResponse("%d", "%s", "%s", "%s", decodeURIComponent("%s"));',
        [ResCode, ResText, ResTime, ResSize, SafeResBody]
      ));

    finally
      HTTPClient.Free;
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
end;

procedure TMainForm.UniFormAfterShow(Sender: TObject);
begin
  UniMainModule.GirisTable.Open;
  UniSession.AddJS('window.setWorkspaceUser(''' +
    UniMainModule.LoggedUserName + ''')');
end;

procedure TMainForm.UniFormCreate(Sender: TObject);
begin
  MainHTML.HTML.LoadFromFile(UniServerModule.FilesFolderPath +
    '/main_form.html', TEncoding.UTF8);
end;

initialization

RegisterAppFormClass(TMainForm);

end.
