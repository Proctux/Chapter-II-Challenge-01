import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyExists = cart.find(product => product.id === productId)

      if(productAlreadyExists) {
        const { amount } = productAlreadyExists;

        const { data: stock } = await api.get<Stock>(`stock/${productId}`)

        const hasProductInStock = stock.amount > amount;

        if(!hasProductInStock) {
          toast.error('Quantidade solicitada fora de estoque')

          return;
        }

        const updateCartAmount = cart.map(product => {
          return product.id === productId
            ? {...product, amount: product.amount + 1}
            : product;
        });

        setCart(updateCartAmount)

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCartAmount))

        return;
      }

      const { data } = await api.get(`products/${productId}`)

      const cartWithNewProduct = [...cart, { ...data, amount: 1 }]

      setCart(cartWithNewProduct);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithNewProduct))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productsExists = cart.find(product => product.id === productId)

      if(!productsExists) {
        toast.error('Erro na remoção do produto')
        return;
      }
      const updatedCartProduct = cart.filter(product => product.id !== productId)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCartProduct))

      setCart(updatedCartProduct);
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updateValueSmallerThanOne = amount < 1;

      if(updateValueSmallerThanOne) {
        toast.error('O valor não pode ser menor que 1')
        return
      }
      const { data: stock } = await api.get<Stock>(`stock/${productId}`)

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque')

        return
      }

      const updatedProductAmount = cart.map(product =>
        product.id === productId
          ? {...product, amount }
          : product
      )

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProductAmount))

      setCart(updatedProductAmount)
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
