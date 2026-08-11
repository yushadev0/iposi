unit loginForm;

interface

uses
  Windows, Messages, SysUtils, Variants, Classes, Graphics,
  Controls, Forms, uniGUITypes, uniGUIAbstractClasses,
  uniGUIClasses, uniGUIRegClasses, uniGUIForm, uniGUIBaseClasses, uniPanel,
  uniHTMLFrame, System.Hash, System.NetEncoding;

type
  TLOGIN_FORM = class(TUniLoginForm)
    LoginHTML: TUniHTMLFrame;
    procedure UniLoginFormCreate(Sender: TObject);
    procedure UniLoginFormAfterShow(Sender: TObject);
    procedure LoginHTMLAjaxEvent(Sender: TComponent; EventName: string;
      Params: TUniStrings);
  private
    { Private declarations }
  public
    { Public declarations }
  end;

function LOGIN_FORM: TLOGIN_FORM;

implementation

{$R *.dfm}

uses
  uniGUIVars, MainModule, uniGUIApplication, ServerModule, Main;

function LOGIN_FORM: TLOGIN_FORM;
begin
  Result := TLOGIN_FORM(UniMainModule.GetFormInstance(TLOGIN_FORM));
end;

procedure TLOGIN_FORM.UniLoginFormCreate(Sender: TObject);
var
  DbPath: string;
begin
  LoginHTML.HTML.LoadFromFile(UniServerModule.FilesFolderPath +
    '/login_form.html', TEncoding.UTF8);
end;

procedure TLOGIN_FORM.UniLoginFormAfterShow(Sender: TObject);
var
  LCookie, LSelector, LValidator, LTokenHash: string;
  LParts: TArray<string>;
begin
  // ==========================================
  // REMEMBER ME
  // ==========================================
  LCookie := UniApplication.Cookies.Values['iposi_remember'];

  if LCookie = '' then
    Exit;

  LParts := LCookie.Split([':']);
  if Length(LParts) = 2 then
  begin
    LSelector := LParts[0];
    LValidator := TNetEncoding.URL.Decode(LParts[1]);
    LTokenHash := THashSHA2.GetHashString(LValidator);

    with UniMainModule.TokenTable do
    begin
      Close;
      SQL.Text := 'SELECT t.user_id, u.username FROM user_tokens t ' +
        'JOIN users u ON t.user_id = u.id ' +
        'WHERE t.selector = :sel AND t.token_hash = :hash AND t.expiry_date > GETDATE()';
      ParamByName('sel').AsString := LSelector;
      ParamByName('hash').AsString := LTokenHash;
      Open;

      if not IsEmpty then
      begin
        UniMainModule.LoggedUserName := FieldByName('username').AsString;
        UniMainModule.LoggedUserId := FieldByName('user_id').AsInteger;
        Self.ModalResult := mrOk;
        Exit;
      end
      else
        Exit;
    end;
  end;
end;

procedure TLOGIN_FORM.LoginHTMLAjaxEvent(Sender: TComponent; EventName: string;
  Params: TUniStrings);
var
  LUser, LEmail, LPass, LHash, LRemember: string;
  LUserId: Integer;
  LSelector, LValidator, LTokenHash: string;
begin
  // ==========================================
  // REGISTER
  // ==========================================
  if EventName = 'AuthRegister' then
  begin
    LUser := TNetEncoding.URL.Decode(Trim(Params.Values['user']));
    LEmail := TNetEncoding.URL.Decode(Trim(Params.Values['email']));
    LPass := TNetEncoding.URL.Decode(Params.Values['pass']);

    LHash := THashSHA2.GetHashString(LPass);

    with UniMainModule.GirisTable do
    begin
      Close;
      SQL.Text := 'SELECT id FROM users WHERE username = :usr';
      ParamByName('usr').AsString := LUser;
      Open;

      if not IsEmpty then
      begin
        Close;
        UniSession.AddJS
          ('window.iposiAlert("Kayıt Başarısız", "Bu kullanıcı adı zaten alınmış.", "error");');
      end
      else
      begin
        Close;

        SQL.Text :=
          'INSERT INTO users (username, email, passwordHash) VALUES (:usr, :eml, :pwd)';
        ParamByName('usr').AsString := LUser;
        ParamByName('eml').AsString := LEmail;
        ParamByName('pwd').AsString := LHash;
        Execute;

        UniSession.AddJS
          ('window.iposiAlert("Hoş Geldiniz!", "Hesabınız başarıyla oluşturuldu. Giriş yapabilirsiniz.", "success");');
        UniSession.AddJS
          ('setTimeout(function(){ window.rotateCard(false); window.closeIposiPopup(); }, 2000);');
      end;
    end;
  end

  // ==========================================
  // LOGIN
  // ==========================================
  else if EventName = 'AuthLogin' then
  begin
    LUser := TNetEncoding.URL.Decode(Trim(Params.Values['user']));
    LPass := TNetEncoding.URL.Decode(Params.Values['pass']);
    LHash := THashSHA2.GetHashString(LPass);
    LRemember := TNetEncoding.URL.Decode(Params.Values['remember']);

    with UniMainModule.GirisTable do
    begin
      Close;
      SQL.Text :=
        'SELECT id, username FROM users WHERE username = :usr AND passwordHash = :pwd';
      ParamByName('usr').AsString := LUser;
      ParamByName('pwd').AsString := LHash;
      Open;

      if IsEmpty then
      begin
        Close;
        UniSession.AddJS
          ('window.iposiAlert("Giriş Başarısız", "Kullanıcı adı veya şifre hatalı.", "error");');
      end
      else
      begin
        LUserId := FieldByName('id').AsInteger;
        UniMainModule.LoggedUserName := FieldByName('username').Text;
        UniMainModule.LoggedUserId := FieldByName('id').AsInteger;

        if LRemember = '1' then
        begin
          LSelector := THashSHA2.GetHashString(TGuid.NewGuid.ToString)
            .Substring(0, 12);
          LValidator := THashSHA2.GetHashString(TGuid.NewGuid.ToString);
          LTokenHash := THashSHA2.GetHashString(LValidator);

          with UniMainModule.TokenTable do
          begin
            Close;
            SQL.Text :=
              'INSERT INTO user_tokens (user_id, selector, token_hash, expiry_date) '
              + 'VALUES (:uid, :sel, :hash, DATEADD(DAY, 30, GETDATE()))';
            ParamByName('uid').AsInteger := LUserId;
            ParamByName('sel').AsString := LSelector;
            ParamByName('hash').AsString := LTokenHash;
            Execute;
          end;

          UniApplication.Cookies.SetCookie('iposi_remember',
            LSelector + ':' + LValidator, Date + 30);
        end;

        Self.ModalResult := mrOk;
      end;
    end;
  end
end;

initialization

RegisterAppFormClass(TLOGIN_FORM);

end.
