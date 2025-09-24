@@ .. @@
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                               classificacao === 'custo_fixo' ? 'bg-red-100 text-red-700' :
-                              classificacao === 'custo_variavel' ? 'bg-orange-100 text-orange-700' :
-                              'bg-blue-100 text-blue-700'
+                              'bg-orange-100 text-orange-700'
                             }`}>
                               {classificacao === 'custo_fixo' ? 'Fixo' :
-                               classificacao === 'custo_variavel' ? 'Variável' :
-                               'Operacional'}
+                               'Variável'}
                             </span>