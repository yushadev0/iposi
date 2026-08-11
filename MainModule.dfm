object UniMainModule: TUniMainModule
  OnCreate = UniGUIMainModuleCreate
  MonitoredKeys.Keys = <>
  Height = 750
  Width = 1000
  PixelsPerInch = 120
  object UniConnection1: TUniConnection
    ProviderName = 'SQL Server'
    Database = 'iposi'
    LoginPrompt = False
    Left = 64
    Top = 104
  end
  object GirisTable: TUniQuery
    Connection = UniConnection1
    SQL.Strings = (
      'select * from users')
    Left = 168
    Top = 104
  end
  object TokenTable: TUniQuery
    Connection = UniConnection1
    Left = 264
    Top = 104
  end
  object SQLServerUniProvider1: TSQLServerUniProvider
    Left = 64
    Top = 24
  end
  object ApiHistoryTable: TUniQuery
    Connection = UniConnection1
    Left = 352
    Top = 104
  end
end
