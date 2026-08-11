unit MainModule;

interface

uses
  uniGUIMainModule, SysUtils, Classes, Data.DB, MemDS, DBAccess, Uni,
  UniProvider, SQLiteUniProvider, SQLServerUniProvider;

type
  TUniMainModule = class(TUniGUIMainModule)
    UniConnection1: TUniConnection;
    GirisTable: TUniQuery;
    TokenTable: TUniQuery;
    SQLServerUniProvider1: TSQLServerUniProvider;
    ApiHistoryTable: TUniQuery;
    procedure UniGUIMainModuleCreate(Sender: TObject);
    procedure UniGUIMainModuleBrowserClose(Sender: TObject);
  private
    { Private declarations }
  public
    { Public declarations }
    LoggedUserName: string;
    LoggedUserId: Integer;
  end;

function UniMainModule: TUniMainModule;

implementation

{$R *.dfm}

uses
  UniGUIVars, ServerModule, uniGUIApplication, SecretConsts;

function UniMainModule: TUniMainModule;
begin
  Result := TUniMainModule(UniApplication.UniMainModule)
end;

procedure TUniMainModule.UniGUIMainModuleBrowserClose(Sender: TObject);
var
  DbPath: string;
begin

end;

procedure TUniMainModule.UniGUIMainModuleCreate(Sender: TObject);
var
  DbPath: string;
begin
  UniConnection1.Close;
  UniConnection1.Server := SecretConsts.Server;
  UniConnection1.Username := SecretConsts.DBUsername;
  UniConnection1.Password := SecretConsts.DBPassword;
  UniConnection1.Connect;

end;

initialization

RegisterMainModuleClass(TUniMainModule);

end.
